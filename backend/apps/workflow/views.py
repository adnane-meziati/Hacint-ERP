from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsAdmin, IsPlannerOrAbove, IsStageWorker

from .models import (
    Apn, ApnAttachment, ApnStageHistory, AttachmentType,
    MatrixSample, Project, ProjectSample, ProjectValidation, ValidationStatus,
    WorkflowOrder, WorkflowOrderStatus, WorkflowStage,
)
from .serializers import (
    ApnAttachmentSerializer,
    ApnCreateSerializer,
    ApnDetailSerializer,
    ApnListSerializer,
    MatrixSampleSerializer,
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectSampleSerializer,
    ProjectValidationSerializer,
    WorkflowOrderCreateSerializer,
    WorkflowOrderDetailSerializer,
    WorkflowOrderListSerializer,
)


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class ProjectListCreateView(generics.ListCreateAPIView):
    """GET /api/workflow/projects/  — list all active projects
    POST /api/workflow/projects/ — create a new project (planner+)
    """

    def get_queryset(self):  # type: ignore[override]
        return (
            Project.objects.filter(deleted_at__isnull=True)
            .prefetch_related("orders", "samples")
        )

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectListSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "POST":
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]


class ProjectDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/workflow/projects/{id}/"""

    def get_queryset(self):  # type: ignore[override]
        return Project.objects.filter(deleted_at__isnull=True).prefetch_related(
            "orders__apns",
            "samples",
            "validation",
        )

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return ProjectCreateSerializer
        return ProjectDetailSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]

    http_method_names = ["get", "patch", "head", "options"]


# ---------------------------------------------------------------------------
# Workflow Orders
# ---------------------------------------------------------------------------

class WorkflowOrderListCreateView(generics.ListCreateAPIView):
    """GET /api/workflow/projects/{pk}/orders/
    POST /api/workflow/projects/{pk}/orders/
    """

    def get_queryset(self):  # type: ignore[override]
        return WorkflowOrder.objects.filter(
            project_id=self.kwargs["pk"],
            deleted_at__isnull=True,
        ).prefetch_related("apns")

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "POST":
            return WorkflowOrderCreateSerializer
        return WorkflowOrderListSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "POST":
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):  # type: ignore[override]
        project = generics.get_object_or_404(Project, pk=self.kwargs["pk"], deleted_at__isnull=True)
        serializer.save(project=project, created_by=self.request.user)


class WorkflowOrderDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/workflow/orders/{id}/"""

    def get_queryset(self):  # type: ignore[override]
        return WorkflowOrder.objects.filter(deleted_at__isnull=True).prefetch_related("apns")

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return WorkflowOrderCreateSerializer
        return WorkflowOrderDetailSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]

    http_method_names = ["get", "patch", "head", "options"]


# ---------------------------------------------------------------------------
# APNs
# ---------------------------------------------------------------------------

class ApnListCreateView(generics.ListCreateAPIView):
    """GET /api/workflow/orders/{pk}/apns/
    POST /api/workflow/orders/{pk}/apns/
    """

    def get_queryset(self):  # type: ignore[override]
        return Apn.objects.filter(
            work_order_id=self.kwargs["pk"],
        ).select_related("assigned_user")

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method == "POST":
            return ApnCreateSerializer
        return ApnListSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "POST":
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):  # type: ignore[override]
        work_order = generics.get_object_or_404(
            WorkflowOrder, pk=self.kwargs["pk"], deleted_at__isnull=True
        )
        serializer.save(work_order=work_order, created_by=self.request.user)


class ApnDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/workflow/apns/{id}/"""

    def get_queryset(self):  # type: ignore[override]
        return Apn.objects.select_related("assigned_user").prefetch_related(
            "history__transitioned_by",
            "attachments",
        )

    def get_serializer_class(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return ApnCreateSerializer
        return ApnDetailSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in ("PUT", "PATCH"):
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]

    http_method_names = ["get", "patch", "head", "options"]


# ---------------------------------------------------------------------------
# Advance stage
# ---------------------------------------------------------------------------

# Ordered list of stages for "next stage" convenience
STAGE_ORDER = [
    WorkflowStage.TECHNICAL_STUDY,
    WorkflowStage.DESIGNER,
    WorkflowStage.PROGRAMMER,
    WorkflowStage.CNC,
    WorkflowStage.QC,
    WorkflowStage.PRODUCTION,
    WorkflowStage.DONE,
]


class AdvanceApnStageView(APIView):
    """POST /api/workflow/apns/{pk}/advance/
    Body: { target_stage: "designer", comment: "optional" }
    Moves the APN to the given stage and records history.
    """

    permission_classes = [IsStageWorker]

    def post(self, request: Request, pk: str) -> Response:
        apn = generics.get_object_or_404(
            Apn.objects.select_related("work_order"),
            pk=pk,
        )

        target_stage = request.data.get("target_stage", "").strip()
        comment = request.data.get("comment", "")

        # Allow "next" as a shorthand for the next stage in sequence
        if target_stage == "next":
            try:
                idx = STAGE_ORDER.index(apn.current_stage)
                if idx + 1 >= len(STAGE_ORDER):
                    return Response(
                        {"detail": "APN is already at the final stage."},
                        status=status.HTTP_409_CONFLICT,
                    )
                target_stage = STAGE_ORDER[idx + 1]
            except ValueError:
                return Response(
                    {"detail": "Current stage is not recognised."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Validate the target stage
        valid_stages = [s.value for s in WorkflowStage]
        if target_stage not in valid_stages:
            return Response(
                {"detail": f"Invalid stage '{target_stage}'. Valid: {valid_stages}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Record history
        ApnStageHistory.objects.create(
            apn=apn,
            from_stage=apn.current_stage,
            to_stage=target_stage,
            transitioned_by=request.user,
            comment=comment,
            created_by=request.user,
        )

        # Update APN
        apn.current_stage = target_stage
        update_fields = ["current_stage", "updated_at", "updated_by"]
        if request.data.get("assigned_user") is not None:
            apn.assigned_user_id = request.data.get("assigned_user")
            update_fields.append("assigned_user")
        apn.updated_by = request.user
        apn.save(update_fields=update_fields)

        # Auto-complete the WorkflowOrder if all its APNs are at DONE
        if target_stage == WorkflowStage.DONE:
            work_order = apn.work_order
            all_done = not work_order.apns.exclude(current_stage=WorkflowStage.DONE).exists()
            if all_done:
                work_order.status = WorkflowOrderStatus.COMPLETED
                work_order.save(update_fields=["status", "updated_at"])

        return Response(ApnDetailSerializer(apn, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

class ApnAttachmentCreateView(APIView):
    """POST /api/workflow/apns/{pk}/attachments/  (multipart)"""

    permission_classes = [IsStageWorker]
    parser_classes = [MultiPartParser]

    def post(self, request: Request, pk: str) -> Response:
        apn = generics.get_object_or_404(Apn, pk=pk)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file is required."}, status=status.HTTP_400_BAD_REQUEST)

        attachment_type = request.data.get("attachment_type", "other")
        valid_types = [t.value for t in AttachmentType]
        if attachment_type not in valid_types:
            attachment_type = "other"

        attachment = ApnAttachment.objects.create(
            apn=apn,
            attachment_type=attachment_type,
            file=file,
            original_name=file.name,
            size_bytes=file.size,
            stage_at_upload=apn.current_stage,
            notes=request.data.get("notes", ""),
            created_by=request.user,
        )
        return Response(
            ApnAttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ApnAttachmentDeleteView(generics.DestroyAPIView):
    """DELETE /api/workflow/attachments/{id}/"""

    permission_classes = [IsPlannerOrAbove]
    queryset = ApnAttachment.objects.all()


# ---------------------------------------------------------------------------
# Queue view — APNs at a specific stage
# ---------------------------------------------------------------------------

class WorkflowQueueView(generics.ListAPIView):
    """GET /api/workflow/queue/{stage}/
    Returns all APNs currently at the given stage.
    """

    serializer_class = ApnDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        stage = self.kwargs["stage"]
        return (
            Apn.objects.filter(current_stage=stage)
            .select_related("work_order__project", "assigned_user")
            .prefetch_related("history__transitioned_by", "attachments")
            .order_by("priority", "work_order__project__code", "apn_code")
        )


# ---------------------------------------------------------------------------
# Technical Study Validation — Reference Matrix
# ---------------------------------------------------------------------------

class MatrixSampleListCreateView(generics.ListCreateAPIView):
    """GET /api/workflow/matrix/  — list all matrix entries
    POST /api/workflow/matrix/   — create entry (admin only)
    """

    queryset = MatrixSample.objects.all()
    serializer_class = MatrixSampleSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "POST":
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(created_by=self.request.user)


class MatrixSampleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/workflow/matrix/{id}/"""

    queryset = MatrixSample.objects.all()
    serializer_class = MatrixSampleSerializer

    def get_permissions(self):  # type: ignore[override]
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def perform_update(self, serializer):  # type: ignore[override]
        serializer.save(updated_by=self.request.user)


# ---------------------------------------------------------------------------
# Technical Study Validation — Project Samples
# ---------------------------------------------------------------------------

class ProjectSampleListCreateView(generics.ListCreateAPIView):
    """GET /api/workflow/projects/{pk}/samples/
    POST /api/workflow/projects/{pk}/samples/
    """

    serializer_class = ProjectSampleSerializer

    def get_queryset(self):  # type: ignore[override]
        return ProjectSample.objects.filter(project_id=self.kwargs["pk"])

    def get_permissions(self):  # type: ignore[override]
        if self.request.method == "POST":
            return [IsPlannerOrAbove()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):  # type: ignore[override]
        project = generics.get_object_or_404(Project, pk=self.kwargs["pk"], deleted_at__isnull=True)
        serializer.save(project=project, created_by=self.request.user)


class ProjectSampleDeleteView(generics.DestroyAPIView):
    """DELETE /api/workflow/samples/{id}/"""

    queryset = ProjectSample.objects.all()
    permission_classes = [IsPlannerOrAbove]


# ---------------------------------------------------------------------------
# Technical Study Validation — Run validation
# ---------------------------------------------------------------------------

def _run_comparison(project: Project) -> dict:
    """Compare project samples against the reference matrix. Returns structured result dict."""
    matrix = {s.reference: s for s in MatrixSample.objects.all()}
    declared = {s.reference: s for s in ProjectSample.objects.filter(project=project)}

    matched, missing, mismatched, extra = [], [], [], []

    for ref, ms in matrix.items():
        ps = declared.get(ref)
        if ps is None:
            missing.append({
                "reference": ref,
                "designation": ms.designation,
                "matrix_quantity": ms.quantity,
                "matrix_type": ms.sample_type,
                "project_quantity": None,
                "project_type": None,
                "status": "missing",
            })
        elif ps.quantity == ms.quantity and ps.sample_type == ms.sample_type:
            matched.append({
                "reference": ref,
                "designation": ms.designation,
                "matrix_quantity": ms.quantity,
                "matrix_type": ms.sample_type,
                "project_quantity": ps.quantity,
                "project_type": ps.sample_type,
                "status": "matched",
            })
        else:
            mismatched.append({
                "reference": ref,
                "designation": ms.designation,
                "matrix_quantity": ms.quantity,
                "matrix_type": ms.sample_type,
                "project_quantity": ps.quantity,
                "project_type": ps.sample_type,
                "status": "mismatched",
            })

    for ref, ps in declared.items():
        if ref not in matrix:
            extra.append({
                "reference": ref,
                "designation": ps.designation,
                "matrix_quantity": None,
                "matrix_type": None,
                "project_quantity": ps.quantity,
                "project_type": ps.sample_type,
                "status": "extra",
            })

    result_status = ValidationStatus.APPROVED if not missing and not mismatched and not extra else ValidationStatus.REJECTED

    return {
        "validation_status": result_status,
        "matched": matched,
        "missing": missing,
        "mismatched": mismatched,
        "extra": extra,
        "summary": {
            "total_matrix": len(matrix),
            "total_project": len(declared),
            "matched": len(matched),
            "missing": len(missing),
            "mismatched": len(mismatched),
            "extra": len(extra),
        },
    }


class ProjectValidateView(APIView):
    """POST /api/workflow/projects/{pk}/validate/
    Runs the comparison and persists the validation result.
    """

    permission_classes = [IsPlannerOrAbove]

    def post(self, request: Request, pk: str) -> Response:
        project = generics.get_object_or_404(Project, pk=pk, deleted_at__isnull=True)

        result = _run_comparison(project)
        new_status = result["validation_status"]

        validation, _ = ProjectValidation.objects.update_or_create(
            project=project,
            defaults={
                "validation_status": new_status,
                "validated_at": timezone.now(),
                "validated_by": request.user,
                "result": result,
                "updated_by": request.user,
                # Reset approval if re-validated and result changed
                "approved_at": None,
                "approved_by": None,
            },
        )

        project.validation_status = new_status
        project.updated_by = request.user
        project.save(update_fields=["validation_status", "updated_at", "updated_by"])

        return Response({
            **result,
            "validation": ProjectValidationSerializer(validation, context={"request": request}).data,
        })


class ProjectApproveView(APIView):
    """POST /api/workflow/projects/{pk}/approve/
    Officially approves the project. Only possible when validation passed 100%.
    """

    permission_classes = [IsPlannerOrAbove]

    def post(self, request: Request, pk: str) -> Response:
        project = generics.get_object_or_404(Project, pk=pk, deleted_at__isnull=True)

        validation = getattr(project, "validation", None)
        if not validation or validation.validation_status != ValidationStatus.APPROVED:
            return Response(
                {"detail": "Le projet doit être validé à 100% avant d'être approuvé."},
                status=status.HTTP_409_CONFLICT,
            )

        validation.approved_at = timezone.now()
        validation.approved_by = request.user
        validation.updated_by = request.user
        validation.save(update_fields=["approved_at", "approved_by", "updated_at", "updated_by"])

        return Response(
            ProjectValidationSerializer(validation, context={"request": request}).data
        )

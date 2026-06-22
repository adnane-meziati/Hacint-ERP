from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PurchaseRequest

# ── Role helpers ──────────────────────────────────────────────────────────────

_GROUP_TO_ROLE = {
    'Designer':             'designer',
    'Programmateur':        'programmer',
    'CNC':                  'cnc',
    'Assembly':             'assembly',
    'Quality':              'quality',
    'Storage':              'storage',
    'Accounting':           'accounting',
    'Etude Technique':      'etude_technique',
    'HR':                   'hr',
    'Logistics':            'logistics',
    'Installation':         'installation',
    'Sales Employee':       'sales_employee',
    'Production Manager':   'production_manager',
    'Storage Manager':      'storage_manager',
    'Accounting Manager':   'accounting_manager',
    'HR Manager':           'hr_manager',
    'Logistics Manager':    'logistics_manager',
    'Installation Manager': 'installation_manager',
    'Sales Manager':        'sales_manager',
}

ROLE_TO_MODULE = {
    'production_manager':   'production',
    'storage_manager':      'storage',
    'accounting_manager':   'accounting',
    'hr_manager':           'hr',
    'logistics_manager':    'logistics',
    'installation_manager': 'installation',
    'sales_manager':        'sales',
}

ACCOUNTING_ROLES = {'accounting', 'accounting_manager', 'admin'}
MANAGER_ROLES    = set(ROLE_TO_MODULE.keys())


def _get_role(user):
    if user.is_superuser or user.is_staff:
        return 'admin'
    groups = set(user.groups.values_list('name', flat=True))
    for g, r in _GROUP_TO_ROLE.items():
        if g in groups:
            return r
    return 'admin'


# ── Serializer ────────────────────────────────────────────────────────────────

def _serialize(req):
    return {
        'id':               req.id,
        'title':            req.title,
        'item_type':        req.item_type,
        'item_type_display': req.get_item_type_display(),
        'quantity':         str(req.quantity),
        'unit':             req.unit,
        'priority':         req.priority,
        'priority_display': req.get_priority_display(),
        'module':           req.module,
        'module_display':   req.get_module_display(),
        'description':      req.description,
        'has_invoice':      bool(req.invoice),
        'invoice_url':      req.invoice.url if req.invoice else None,
        'estimated_cost':   str(req.estimated_cost) if req.estimated_cost is not None else None,
        'status':           req.status,
        'status_display':   req.get_status_display(),
        'requested_by':     req.requested_by.get_full_name() or req.requested_by.username,
        'created_at':       req.created_at.isoformat(),
        'updated_at':       req.updated_at.isoformat(),
        'reviewed_by':      (req.reviewed_by.get_full_name() or req.reviewed_by.username) if req.reviewed_by else None,
        'reviewed_at':      req.reviewed_at.isoformat() if req.reviewed_at else None,
        'accounting_notes': req.accounting_notes,
        'po_number':        req.po_number,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def request_list(request):
    role = _get_role(request.user)

    if request.method == 'GET':
        qs = PurchaseRequest.objects.select_related('requested_by', 'reviewed_by')

        if role in ACCOUNTING_ROLES:
            # Accounting / admin sees everything, optional filters
            if request.GET.get('module'):
                qs = qs.filter(module=request.GET['module'])
        else:
            module = ROLE_TO_MODULE.get(role)
            if module:
                qs = qs.filter(module=module)
            else:
                qs = qs.filter(requested_by=request.user)

        if request.GET.get('status'):
            qs = qs.filter(status=request.GET['status'])

        return Response([_serialize(r) for r in qs])

    # POST — create
    if role not in MANAGER_ROLES and role != 'admin':
        return Response({'error': 'Seuls les responsables peuvent créer des demandes.'}, status=403)

    title = request.data.get('title', '').strip()
    if not title:
        return Response({'error': 'Le titre est obligatoire.'}, status=400)

    module = ROLE_TO_MODULE.get(role) or request.data.get('module', 'production')

    req = PurchaseRequest(
        title          = title,
        item_type      = request.data.get('item_type', 'product'),
        quantity       = request.data.get('quantity', 1) or 1,
        unit           = request.data.get('unit', 'pcs'),
        priority       = request.data.get('priority', 'medium'),
        module         = module,
        description    = request.data.get('description', ''),
        estimated_cost = request.data.get('estimated_cost') or None,
        requested_by   = request.user,
    )
    if 'invoice' in request.FILES:
        req.invoice = request.FILES['invoice']
    req.save()
    return Response(_serialize(req), status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def request_detail(request, pk):
    try:
        req = PurchaseRequest.objects.select_related('requested_by', 'reviewed_by').get(pk=pk)
    except PurchaseRequest.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=404)

    role     = _get_role(request.user)
    is_acct  = role in ACCOUNTING_ROLES
    is_owner = req.requested_by_id == request.user.pk

    if not is_acct and not is_owner:
        return Response({'error': 'Accès refusé.'}, status=403)

    if request.method == 'GET':
        return Response(_serialize(req))

    if request.method == 'DELETE':
        if not (is_owner and req.status == 'pending') and role != 'admin':
            return Response({'error': 'Impossible de supprimer cette demande.'}, status=403)
        req.delete()
        return Response({'ok': True})

    # PATCH
    if is_owner and req.status == 'pending':
        for f in ('title', 'item_type', 'quantity', 'unit', 'priority', 'description'):
            if f in request.data:
                setattr(req, f, request.data[f])
        if 'estimated_cost' in request.data:
            req.estimated_cost = request.data['estimated_cost'] or None
        if 'invoice' in request.FILES:
            req.invoice = request.FILES['invoice']

    if is_acct:
        if 'accounting_notes' in request.data:
            req.accounting_notes = request.data['accounting_notes']
        if 'po_number' in request.data:
            req.po_number = request.data['po_number']
        if request.data.get('status') in ('ordered', 'received'):
            req.status = request.data['status']

    req.save()
    return Response(_serialize(req))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_approve(request, pk):
    if _get_role(request.user) not in ACCOUNTING_ROLES:
        return Response({'error': 'Accès refusé.'}, status=403)
    try:
        req = PurchaseRequest.objects.select_related('requested_by', 'reviewed_by').get(pk=pk)
    except PurchaseRequest.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=404)
    if req.status != 'pending':
        return Response({'error': 'Seules les demandes en attente peuvent être approuvées.'}, status=400)

    req.status           = 'approved'
    req.reviewed_by      = request.user
    req.reviewed_at      = timezone.now()
    req.accounting_notes = request.data.get('accounting_notes', req.accounting_notes)
    req.po_number        = request.data.get('po_number', req.po_number)
    req.save()
    return Response(_serialize(req))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_reject(request, pk):
    if _get_role(request.user) not in ACCOUNTING_ROLES:
        return Response({'error': 'Accès refusé.'}, status=403)
    try:
        req = PurchaseRequest.objects.select_related('requested_by', 'reviewed_by').get(pk=pk)
    except PurchaseRequest.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=404)
    if req.status not in ('pending', 'approved'):
        return Response({'error': 'Cette demande ne peut pas être rejetée.'}, status=400)

    req.status           = 'rejected'
    req.reviewed_by      = request.user
    req.reviewed_at      = timezone.now()
    req.accounting_notes = request.data.get('accounting_notes', req.accounting_notes)
    req.save()
    return Response(_serialize(req))

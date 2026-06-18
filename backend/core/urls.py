import mimetypes
import os
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import Group, User
from django.http import FileResponse, HttpResponse
from django.middleware.csrf import get_token
from django.urls import include, path, re_path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response


# ── Auth endpoints ────────────────────────────────────────────────────────────

def _user_payload(user):
    """Return a dict with user info + role derived from group membership."""
    if user.is_superuser or user.is_staff:
        role = 'admin'
    else:
        groups = list(user.groups.values_list('name', flat=True))
        if 'Designer' in groups:
            role = 'designer'
        elif 'Programmateur' in groups:
            role = 'programmer'
        elif 'CNC' in groups:
            role = 'cnc'
        elif 'Assembly' in groups:
            role = 'assembly'
        elif 'Quality' in groups:
            role = 'quality'
        elif 'Storage' in groups:
            role = 'storage'
        elif 'Accounting' in groups:
            role = 'accounting'
        elif 'Etude Technique' in groups:
            role = 'etude_technique'
        else:
            role = 'admin'   # fallback: full access for ungrouped accounts
    return {
        'id': user.pk,
        'username': user.username,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'email': user.email,
        'role': role,
        'assetIds': [ua.asset_id for ua in user.asset_assignments.all()],
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_view(request):
    return Response({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)
        return Response(_user_payload(user))
    return Response({'error': 'Identifiants invalides'}, status=400)


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
def me_view(request):
    return Response(_user_payload(request.user))


# ── User management (admin only) ─────────────────────────────────────────────

def _set_role(user, role):
    """Sync a user's group + staff flag from a plain role string."""
    user.groups.clear()
    if role == 'admin':
        user.is_staff = True
    elif role == 'designer':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Designer')[0])
    elif role == 'programmer':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Programmateur')[0])
    elif role == 'cnc':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='CNC')[0])
    elif role == 'assembly':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Assembly')[0])
    elif role == 'quality':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Quality')[0])
    elif role == 'storage':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Storage')[0])
    elif role == 'accounting':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Accounting')[0])
    elif role == 'etude_technique':
        user.is_staff = False
        user.groups.add(Group.objects.get_or_create(name='Etude Technique')[0])
    user.save(update_fields=['is_staff'])


def _set_assets(user, asset_ids):
    """Sync the user's UserAsset rows (machines/PC/outils affectés) to `asset_ids`."""
    from accounting.models import Asset, UserAsset

    ids = set(Asset.objects.filter(id__in=asset_ids).values_list('id', flat=True))
    UserAsset.objects.filter(user=user).exclude(asset_id__in=ids).delete()
    existants = set(UserAsset.objects.filter(user=user).values_list('asset_id', flat=True))
    UserAsset.objects.bulk_create([
        UserAsset(user=user, asset_id=aid) for aid in ids - existants
    ])


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def users_view(request):
    if request.method == 'GET':
        users = (
            User.objects.filter(is_active=True)
            .prefetch_related('groups', 'asset_assignments')
            .order_by('username')
        )
        return Response([_user_payload(u) for u in users])

    # POST — create new user
    username   = request.data.get('username', '').strip()
    password   = request.data.get('password', '').strip()
    first_name = request.data.get('firstName', '').strip()
    last_name  = request.data.get('lastName', '').strip()
    role       = request.data.get('role', 'designer')

    if not username or not password:
        return Response({'error': "Nom d'utilisateur et mot de passe requis."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': f"Le nom d'utilisateur « {username} » existe déjà."}, status=400)

    user = User.objects.create_user(
        username, password=password,
        first_name=first_name, last_name=last_name,
    )
    _set_role(user, role)
    _set_assets(user, request.data.get('assetIds', []))
    return Response(_user_payload(user), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def user_detail_view(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=404)

    if user.is_superuser:
        return Response({'error': 'Le superutilisateur ne peut pas être modifié ici.'}, status=403)

    if request.method == 'DELETE':
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'ok': True})

    # PATCH
    if 'firstName' in request.data:
        user.first_name = request.data['firstName']
    if 'lastName' in request.data:
        user.last_name = request.data['lastName']
    if 'role' in request.data:
        _set_role(user, request.data['role'])
    if request.data.get('password'):
        user.set_password(request.data['password'])
    user.save()
    if 'assetIds' in request.data:
        _set_assets(user, request.data['assetIds'])
    return Response(_user_payload(user))


# ── React SPA catch-all ───────────────────────────────────────────────────────

def serve_react(request, path=''):
    """
    Serve the built React application.
    - If the requested path matches a real file inside frontend_dist/, serve it
      directly (JS bundles, CSS, images, favicon…).
    - Otherwise fall back to index.html so React Router handles the route.
    - If the frontend hasn't been built yet, return a helpful 503 page.
    """
    dist: Path = settings.FRONTEND_DIST_DIR

    if not dist.exists():
        return HttpResponse(
            """
            <html><body style="font-family:system-ui;padding:2rem">
            <h2>⚙️ Frontend non compilé</h2>
            <p>Lancez la commande suivante puis rechargez&nbsp;:</p>
            <pre style="background:#f0f0f0;padding:1rem;border-radius:6px">
cd frontend
npm install
npm run build</pre>
            </body></html>
            """,
            content_type='text/html',
            status=503,
        )

    # Try to serve the exact file (assets, favicon, manifest…)
    candidate = dist / path
    if candidate.is_file():
        ct, _ = mimetypes.guess_type(str(candidate))
        return FileResponse(open(candidate, 'rb'), content_type=ct or 'application/octet-stream')

    # SPA fallback: let React Router handle the URL
    return FileResponse(open(dist / 'index.html', 'rb'), content_type='text/html')


# ── CAD file server — opens inline so Windows launches SolidWorks / TopSolid ─
CAD_EXTENSIONS = {'.sldprt', '.sldasm', '.slddrw', '.top', '.ens', '.toppkg',
                  '.step', '.stp', '.iges', '.igs', '.dxf'}

# Images (sample photos + thumbnails) must also be served inline so <img> tags
# can render them — otherwise the browser treats them as a download.
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_cad_file(request, file_path):
    """
    Serve a media file.
    CAD files & images → Content-Disposition: inline  (Windows opens in SolidWorks/TopSolid directly, images render in <img>)
    PDF files → Content-Disposition: attachment (downloads normally)
    """
    full_path = Path(settings.MEDIA_ROOT) / file_path
    if not full_path.exists() or not full_path.is_file():
        return HttpResponse(status=404)

    # Security: make sure path doesn't escape MEDIA_ROOT
    try:
        full_path.resolve().relative_to(Path(settings.MEDIA_ROOT).resolve())
    except ValueError:
        return HttpResponse(status=403)

    ext = full_path.suffix.lower()
    ct, _ = mimetypes.guess_type(str(full_path))
    content_type = ct or 'application/octet-stream'

    response = FileResponse(open(full_path, 'rb'), content_type=content_type)

    if ext in CAD_EXTENSIONS or ext in IMAGE_EXTENSIONS:
        # inline → browser hands off to OS / renders image directly
        response['Content-Disposition'] = f'inline; filename="{full_path.name}"'
    else:
        response['Content-Disposition'] = f'attachment; filename="{full_path.name}"'

    return response


# ── URL patterns ──────────────────────────────────────────────────────────────

urlpatterns = [
    path('admin/',                    admin.site.urls),
    path('api/auth/csrf/',            csrf_view),
    path('api/auth/login/',           login_view),
    path('api/auth/logout/',          logout_view),
    path('api/auth/me/',              me_view),
    path('api/auth/users/',           users_view),
    path('api/auth/users/<int:pk>/',  user_detail_view),
    path('api/storage/',              include('storage.urls')),
    path('api/accounting/',           include('accounting.urls')),
    path('api/hr/',                   include('hr.urls')),
    path('api/logistics/',            include('logistics.urls')),
    path('api/installation/',         include('installation.urls')),
    path('api/',                      include('samples.urls')),

    # Media files — CAD files open inline (SolidWorks/TopSolid), PDFs download
    re_path(r'^media/(?P<file_path>.+)$', serve_cad_file),

    # Catch-all: anything that isn't api/ admin/ media/ static/ goes to React
    re_path(r'^(?!api/|admin/|media/|static/)(?P<path>.*)$', serve_react),
]

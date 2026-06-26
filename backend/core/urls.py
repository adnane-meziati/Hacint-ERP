import mimetypes
import os
import random
import string
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import Group, User
from django.core.mail import send_mail
from django.http import FileResponse, HttpResponse
from django.middleware.csrf import get_token
from django.urls import include, path, re_path
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response


# ── OTP helpers ───────────────────────────────────────────────────────────────

def _generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def _email_hint(email):
    """Return a partially masked email for display, e.g. 'a***@hacint.com.cn'."""
    parts = email.split('@')
    local = parts[0]
    masked = local[0] + '***' + (local[-1] if len(local) > 2 else '')
    return f"{masked}@{parts[1]}"


def _send_otp(user, profile, purpose):
    from accounts.models import UserProfile
    code = _generate_otp()
    profile.otp_code = code
    profile.otp_purpose = purpose
    profile.otp_expires = timezone.now() + timedelta(minutes=10)
    profile.save(update_fields=['otp_code', 'otp_purpose', 'otp_expires'])

    name = user.first_name or user.username
    if purpose == 'login':
        subject = 'Code de vérification — Hacint ERP'
        body = (
            f"Bonjour {name},\n\n"
            f"Votre code de vérification Hacint ERP est :\n\n"
            f"    {code}\n\n"
            f"Ce code expire dans 10 minutes.\n\n"
            f"Si vous n'êtes pas à l'origine de cette connexion, ignorez cet email.\n\n"
            f"— Hacint ERP"
        )
    else:
        subject = 'Réinitialisation du mot de passe — Hacint ERP'
        body = (
            f"Bonjour {name},\n\n"
            f"Vous avez demandé à réinitialiser votre mot de passe.\n\n"
            f"Votre code de réinitialisation est :\n\n"
            f"    {code}\n\n"
            f"Ce code expire dans 10 minutes.\n\n"
            f"Si vous n'avez pas effectué cette demande, ignorez cet email.\n\n"
            f"— Hacint ERP"
        )

    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _user_payload(user):
    """Return a dict with user info + role derived from group membership."""
    from accounts.roles import role_from_user
    role = role_from_user(user)

    try:
        must_change = user.profile.must_change_password
    except Exception:
        must_change = False

    return {
        'id': user.pk,
        'username': user.username,
        'firstName': user.first_name,
        'lastName': user.last_name,
        'email': user.email,
        'role': role,
        'must_change_password': must_change,
        'assetIds': [ua.asset_id for ua in user.asset_assignments.all()],
    }


# ── Auth endpoints ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_view(request):
    return Response({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    from accounts.models import UserProfile
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if not user:
        # Try matching by email in case the user typed their email address
        try:
            u = User.objects.get(email__iexact=username, is_active=True)
            user = authenticate(request, username=u.username, password=password)
        except User.DoesNotExist:
            pass
    if not user:
        return Response({'error': 'Identifiants invalides'}, status=400)

    profile, _ = UserProfile.objects.get_or_create(user=user)

    if user.email and not profile.email_verified:
        # First login — require OTP to verify email ownership
        try:
            _send_otp(user, profile, 'login')
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error("OTP email failed for %s: %s", user.username, exc)
            return Response(
                {'error': "Impossible d'envoyer le code par email. Contactez l'administrateur."},
                status=503,
            )
        return Response({
            'requires_otp': True,
            'user_id': user.pk,
            'email_hint': _email_hint(user.email),
        })

    # Email already verified (or no email) — log in directly
    login(request, user)
    return Response(_user_payload(user))


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    from accounts.models import UserProfile
    user_id = request.data.get('user_id')
    code = str(request.data.get('code', '')).strip()

    try:
        user = User.objects.get(pk=user_id, is_active=True)
        profile = user.profile
    except (User.DoesNotExist, Exception):
        return Response({'error': 'Code invalide ou expiré.'}, status=400)

    if not profile.is_otp_valid(code, 'login'):
        return Response({'error': 'Code invalide ou expiré.'}, status=400)

    profile.clear_otp()
    if not profile.email_verified:
        profile.email_verified = True
        profile.save(update_fields=['email_verified'])
    login(request, user)
    return Response(_user_payload(user))


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp_view(request):
    from accounts.models import UserProfile
    user_id = request.data.get('user_id')
    purpose = request.data.get('purpose', 'login')

    try:
        user = User.objects.get(pk=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({'ok': True})  # don't reveal user existence

    if not user.email:
        return Response({'error': "Aucun email configuré pour ce compte."}, status=400)

    profile, _ = UserProfile.objects.get_or_create(user=user)

    # Cooldown: prevent resend if OTP was sent less than 60 seconds ago
    if profile.otp_expires and profile.otp_purpose == purpose:
        sent_at = profile.otp_expires - timedelta(minutes=10)
        if timezone.now() < sent_at + timedelta(seconds=60):
            return Response({'error': 'Veuillez attendre 60 secondes avant de renvoyer.'}, status=429)

    _send_otp(user, profile, purpose)
    return Response({'ok': True, 'email_hint': _email_hint(user.email)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    from accounts.models import UserProfile
    new_password = request.data.get('new_password', '')
    if not new_password or len(new_password) < 6:
        return Response({'error': 'Le mot de passe doit contenir au moins 6 caractères.'}, status=400)

    request.user.set_password(new_password)
    request.user.save()

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.must_change_password = False
    profile.save(update_fields=['must_change_password'])

    # Keep session alive after password change
    login(request, request.user)
    return Response(_user_payload(request.user))


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    from accounts.models import UserProfile
    username = request.data.get('username', '').strip()
    try:
        user = User.objects.get(username=username, is_active=True)
    except User.DoesNotExist:
        return Response({'ok': True})  # don't reveal if user exists

    if not user.email:
        return Response({'error': "Aucun email associé à ce compte. Contactez l'administrateur."}, status=400)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    try:
        _send_otp(user, profile, 'reset')
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Reset OTP email failed for %s: %s", user.username, exc)
        return Response({'error': "Impossible d'envoyer le code par email. Contactez l'administrateur."}, status=503)
    return Response({'ok': True, 'user_id': user.pk, 'email_hint': _email_hint(user.email)})


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    from accounts.models import UserProfile
    user_id = request.data.get('user_id')
    code = str(request.data.get('code', '')).strip()
    new_password = request.data.get('new_password', '')

    if not new_password or len(new_password) < 6:
        return Response({'error': 'Le mot de passe doit contenir au moins 6 caractères.'}, status=400)

    try:
        user = User.objects.get(pk=user_id, is_active=True)
        profile = user.profile
    except (User.DoesNotExist, Exception):
        return Response({'error': 'Code invalide ou expiré.'}, status=400)

    if not profile.is_otp_valid(code, 'reset'):
        return Response({'error': 'Code invalide ou expiré.'}, status=400)

    user.set_password(new_password)
    user.save()
    profile.clear_otp()
    profile.must_change_password = False
    profile.save(update_fields=['must_change_password'])

    return Response({'ok': True})


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
def me_view(request):
    return Response(_user_payload(request.user))


# ── User management (admin only) ─────────────────────────────────────────────

def _set_role(user, role):
    """Sync a user's group + staff flag from a plain role string. Caller must save the user."""
    from accounts.roles import ROLE_GROUPS
    user.groups.clear()
    user.is_staff = False
    if role == 'admin':
        user.is_staff = True
    elif role in ROLE_GROUPS:
        for group_name in ROLE_GROUPS[role]:
            user.groups.add(Group.objects.get_or_create(name=group_name)[0])


def _set_assets(user, asset_ids):
    """Sync the user's UserAsset rows to `asset_ids`."""
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
    email      = request.data.get('email', username).strip()  # default email to username

    if not username or not password:
        return Response({'error': "Nom d'utilisateur et mot de passe requis."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': f"Le nom d'utilisateur « {username} » existe déjà."}, status=400)

    user = User.objects.create_user(
        username, password=password,
        first_name=first_name, last_name=last_name,
        email=email or username,  # username is email-formatted, use it as email
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

    if user == request.user and 'role' in request.data and request.data['role'] != 'admin':
        return Response({'error': 'Vous ne pouvez pas changer votre propre rôle.'}, status=403)

    if request.method == 'DELETE':
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'ok': True})

    # PATCH
    if 'firstName' in request.data:
        user.first_name = request.data['firstName']
    if 'lastName' in request.data:
        user.last_name = request.data['lastName']
    if 'email' in request.data:
        user.email = request.data['email']
    if 'role' in request.data:
        _set_role(user, request.data['role'])
    if request.data.get('password'):
        user.set_password(request.data['password'])
    user.save()
    if 'assetIds' in request.data:
        _set_assets(user, request.data['assetIds'])
    user.refresh_from_db()
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


# ── CAD file server ───────────────────────────────────────────────────────────
CAD_EXTENSIONS = {'.sldprt', '.sldasm', '.slddrw', '.top', '.ens', '.toppkg',
                  '.step', '.stp', '.iges', '.igs', '.dxf'}

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_cad_file(request, file_path):
    full_path = Path(settings.MEDIA_ROOT) / file_path
    if not full_path.exists() or not full_path.is_file():
        return HttpResponse(status=404)

    try:
        full_path.resolve().relative_to(Path(settings.MEDIA_ROOT).resolve())
    except ValueError:
        return HttpResponse(status=403)

    ext = full_path.suffix.lower()
    ct, _ = mimetypes.guess_type(str(full_path))
    content_type = ct or 'application/octet-stream'

    response = FileResponse(open(full_path, 'rb'), content_type=content_type)

    if ext in CAD_EXTENSIONS or ext in IMAGE_EXTENSIONS:
        response['Content-Disposition'] = f'inline; filename="{full_path.name}"'
    else:
        response['Content-Disposition'] = f'attachment; filename="{full_path.name}"'

    return response


# ── URL patterns ──────────────────────────────────────────────────────────────

urlpatterns = [
    path('admin/',                         admin.site.urls),
    path('api/auth/csrf/',                 csrf_view),
    path('api/auth/login/',                login_view),
    path('api/auth/logout/',               logout_view),
    path('api/auth/me/',                   me_view),
    path('api/auth/verify-otp/',           verify_otp_view),
    path('api/auth/resend-otp/',           resend_otp_view),
    path('api/auth/change-password/',      change_password_view),
    path('api/auth/forgot-password/',      forgot_password_view),
    path('api/auth/reset-password/',       reset_password_view),
    path('api/auth/users/',                users_view),
    path('api/auth/users/<int:pk>/',       user_detail_view),
    path('api/storage/',                   include('storage.urls')),
    path('api/accounting/',                include('accounting.urls')),
    path('api/hr/',                        include('hr.urls')),
    path('api/logistics/',                 include('logistics.urls')),
    path('api/installation/',              include('installation.urls')),
    path('api/procurement/',              include('procurement.urls')),
    path('api/',                           include('samples.urls')),

    re_path(r'^media/(?P<file_path>.+)$', serve_cad_file),
    re_path(r'^(?!api/|admin/|media/|static/)(?P<path>.*)$', serve_react),
]

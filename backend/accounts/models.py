from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    must_change_password = models.BooleanField(default=True)
    otp_code = models.CharField(max_length=6, blank=True)
    otp_expires = models.DateTimeField(null=True, blank=True)
    otp_purpose = models.CharField(max_length=10, blank=True)  # 'login' or 'reset'

    def is_otp_valid(self, code, purpose):
        return (
            bool(self.otp_code)
            and self.otp_code == code
            and self.otp_purpose == purpose
            and self.otp_expires is not None
            and timezone.now() < self.otp_expires
        )

    def clear_otp(self):
        self.otp_code = ''
        self.otp_expires = None
        self.otp_purpose = ''
        self.save(update_fields=['otp_code', 'otp_expires', 'otp_purpose'])

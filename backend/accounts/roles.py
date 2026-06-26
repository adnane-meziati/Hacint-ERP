from django.contrib.auth.models import User


DEFAULT_USER_PASSWORD = 'HELLO123'

ROLE_GROUPS = {
    'designer': ('Designer',),
    'programmer': ('Programmateur',),
    'cnc': ('CNC',),
    'assembly': ('Assembly',),
    'quality': ('Quality',),
    'storage': ('Storage',),
    'accounting': ('Accounting',),
    'etude_technique': ('Etude Technique',),
    'production_manager': ('Production Manager',),
    'storage_manager': ('Storage Manager',),
    'accounting_manager': ('Accounting Manager',),
    'hr_manager': ('HR Manager',),
    'hr': ('HR',),
    'logistics_manager': ('Logistics Manager',),
    'logistics': ('Logistics',),
    'installation_manager': ('Installation Manager',),
    'installation': ('Installation',),
    'sales_manager': ('Sales Manager', 'Commercial Manager'),
    'sales_employee': ('Sales Employee', 'Commercial'),
}

VALID_ROLES = frozenset({'admin', *ROLE_GROUPS})

ROLE_PRIORITY = (
    'sales_manager',
    'sales_employee',
    'designer',
    'programmer',
    'cnc',
    'assembly',
    'quality',
    'storage',
    'accounting',
    'etude_technique',
    'production_manager',
    'storage_manager',
    'accounting_manager',
    'hr_manager',
    'hr',
    'logistics_manager',
    'logistics',
    'installation_manager',
    'installation',
)


def user_group_names(user: User) -> set[str]:
    if not user or not user.is_authenticated:
        return set()
    return set(user.groups.values_list('name', flat=True))


def user_has_any_group(user: User, group_names) -> bool:
    names = tuple(group_names)
    if not names:
        return False
    return bool(user and user.is_authenticated and user.groups.filter(name__in=names).exists())


def role_from_user(user: User) -> str:
    if user.is_superuser or user.is_staff:
        return 'admin'

    groups = user_group_names(user)
    for role in ROLE_PRIORITY:
        if groups.intersection(ROLE_GROUPS[role]):
            return role
    return 'unassigned'


def is_sales_manager(user: User) -> bool:
    return user_has_any_group(user, ROLE_GROUPS['sales_manager'])


def is_sales_employee(user: User) -> bool:
    return (
        not is_sales_manager(user)
        and user_has_any_group(user, ROLE_GROUPS['sales_employee'])
    )


def is_sales_user(user: User) -> bool:
    return is_sales_manager(user) or is_sales_employee(user)

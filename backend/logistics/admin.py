from django.contrib import admin

from .models import (
    DeliveryOrder,
    Driver,
    LogisticsNotification,
    LogisticsTask,
    LogisticsTaskAttachment,
    LogisticsTaskComment,
    LogisticsTaskHistory,
    Shipment,
    Vehicle,
    WarehouseTransfer,
)


admin.site.register(Vehicle)
admin.site.register(Driver)
admin.site.register(DeliveryOrder)
admin.site.register(Shipment)
admin.site.register(WarehouseTransfer)
admin.site.register(LogisticsTask)
admin.site.register(LogisticsTaskComment)
admin.site.register(LogisticsTaskAttachment)
admin.site.register(LogisticsTaskHistory)
admin.site.register(LogisticsNotification)
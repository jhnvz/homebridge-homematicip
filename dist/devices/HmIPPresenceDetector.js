import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP presence detector
 *
 * HmIP-SPI (Presence Sensor - indoor)
 *
 */
export class HmIPPresenceDetector extends HmIPGenericDevice {
    service;
    presenceDetected = false;
    sabotage = false;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug('Created PresenceDetector %s', accessory.context.device.label);
        this.service = this.accessory.getService(this.platform.Service.OccupancySensor)
            || this.accessory.addService(this.platform.Service.OccupancySensor);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
            .on('get', this.handleOccupancyDetectedGet.bind(this));
        if (this.featureSabotage) {
            this.service.getCharacteristic(this.platform.Characteristic.StatusTampered)
                .on('get', this.handleStatusTamperedGet.bind(this));
        }
        this.updateDevice(accessory.context.device, platform.groups);
    }
    handleOccupancyDetectedGet(callback) {
        callback(null, this.presenceDetected
            ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    }
    handleStatusTamperedGet(callback) {
        callback(null, this.sabotage
            ? this.platform.Characteristic.StatusTampered.TAMPERED
            : this.platform.Characteristic.StatusTampered.NOT_TAMPERED);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'PRESENCE_DETECTION_CHANNEL') {
                const presenceDetectionChannel = channel;
                this.platform.log.debug('Presence detector update: %s', JSON.stringify(channel));
                if (presenceDetectionChannel.presenceDetected !== null && presenceDetectionChannel.presenceDetected !== this.presenceDetected) {
                    this.presenceDetected = presenceDetectionChannel.presenceDetected;
                    this.platform.log.debug('Presence detector state of %s changed to %s', this.accessory.displayName, this.presenceDetected);
                    this.service.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.presenceDetected
                        ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
                        : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
                }
            }
            if (channel.functionalChannelType === 'DEVICE_SABOTAGE') {
                const sabotageChannel = channel;
                if (sabotageChannel.sabotage !== null && sabotageChannel.sabotage !== this.sabotage) {
                    this.sabotage = sabotageChannel.sabotage;
                    this.platform.log.info('Sabotage state of %s changed to %s', this.accessory.displayName, this.sabotage);
                    this.service.updateCharacteristic(this.platform.Characteristic.StatusTampered, this.sabotage
                        ? this.platform.Characteristic.StatusTampered.TAMPERED
                        : this.platform.Characteristic.StatusTampered.NOT_TAMPERED);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPPresenceDetector.js.map
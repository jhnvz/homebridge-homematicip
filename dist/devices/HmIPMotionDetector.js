import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP motion detector
 *
 * HmIP-SMI (Motion Detector with Brightness Sensor - indoor)
 * HmIP-SMO-A (Motion Detector with Brightness Sensor - outdoor)
 * HmIP-SMI55 (Motion Detector with Brightness Sensor and Remote Control - 2-button)
 *
 */
export class HmIPMotionDetector extends HmIPGenericDevice {
    service;
    motionDetected = false;
    sabotage = false;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug('Created MotionDetector %s', accessory.context.device.label);
        this.service = this.accessory.getService(this.platform.Service.MotionSensor)
            || this.accessory.addService(this.platform.Service.MotionSensor);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.service.getCharacteristic(this.platform.Characteristic.MotionDetected)
            .on('get', this.handleMotionDetectedGet.bind(this));
        if (this.featureSabotage) {
            this.service.getCharacteristic(this.platform.Characteristic.StatusTampered)
                .on('get', this.handleStatusTamperedGet.bind(this));
        }
        this.updateDevice(accessory.context.device, platform.groups);
    }
    handleMotionDetectedGet(callback) {
        callback(null, this.motionDetected);
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
            if (channel.functionalChannelType === 'MOTION_DETECTION_CHANNEL') {
                const motionDetectionChannel = channel;
                this.platform.log.debug('Motion detector update: %s', JSON.stringify(channel));
                if (motionDetectionChannel.motionDetected !== null && motionDetectionChannel.motionDetected !== this.motionDetected) {
                    this.motionDetected = motionDetectionChannel.motionDetected;
                    this.platform.log.debug('Motion detector state of %s changed to %s', this.accessory.displayName, this.motionDetected);
                    this.service.updateCharacteristic(this.platform.Characteristic.MotionDetected, this.motionDetected);
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
//# sourceMappingURL=HmIPMotionDetector.js.map
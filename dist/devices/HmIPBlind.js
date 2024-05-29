import { HmIPShutter } from './HmIPShutter.js';
/**
 * HomematicIP blind
 *
 * HmIP-FBL (Blind Actuator - flush-mount)
 * HmIP-BBL (Blind Actuator - brand-mount)
 *
 */
export class HmIPBlind extends HmIPShutter {
    // Values are HomeKit style (-90..+90)
    slatsLevel = 0;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.service.getCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle)
            .on('get', this.handleCurrentHorizontalTiltAngleGet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.TargetHorizontalTiltAngle)
            .on('get', this.handleTargetHorizontalTiltAngleGet.bind(this))
            .on('set', this.handleTargetHorizontalTiltAngleSet.bind(this));
    }
    handleCurrentHorizontalTiltAngleGet(callback) {
        callback(null, this.slatsLevel);
    }
    handleTargetHorizontalTiltAngleGet(callback) {
        callback(null, this.slatsLevel);
    }
    async handleTargetHorizontalTiltAngleSet(value, callback) {
        this.platform.log.info('Setting target horizontal slats position for %s to %s°', this.accessory.displayName, value);
        const body = {
            channelIndex: 1,
            deviceId: this.accessory.context.device.id,
            shutterLevel: HmIPShutter.shutterHomeKitToHmIP(this.shutterLevel),
            slatsLevel: HmIPBlind.slatsHomeKitToHmIP(value),
        };
        await this.platform.connector.apiCall('device/control/setSlatsLevel', body);
        callback(null);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'BLIND_CHANNEL') {
                const blindChannel = channel;
                const slatsLevelHomeKit = HmIPBlind.slatsHmIPToHomeKit(blindChannel.slatsLevel);
                if (slatsLevelHomeKit !== this.slatsLevel) {
                    this.slatsLevel = slatsLevelHomeKit;
                    this.platform.log.debug('Current blind slats level of %s changed to %s°', this.accessory.displayName, this.slatsLevel.toFixed(0));
                    this.service.updateCharacteristic(this.platform.Characteristic.CurrentHorizontalTiltAngle, this.slatsLevel);
                    this.service.updateCharacteristic(this.platform.Characteristic.TargetHorizontalTiltAngle, this.slatsLevel);
                }
            }
        }
    }
    static slatsHmIPToHomeKit(hmIPValue) {
        return -90 + (hmIPValue * 180.0);
    }
    static slatsHomeKitToHmIP(homeKitValue) {
        return (homeKitValue + 90) / 180.0;
    }
}
//# sourceMappingURL=HmIPBlind.js.map
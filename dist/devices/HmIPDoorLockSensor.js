import { HmIPGenericDevice } from './HmIPGenericDevice.js';
var LockState;
(function (LockState) {
    LockState["UNKNOWN"] = "UNKNOWN";
    LockState["UNLOCKED"] = "UNLOCKED";
    LockState["LOCKED"] = "LOCKED";
})(LockState || (LockState = {}));
/**
 * HomematicIP door lock sensor
 *
 * HmIP-DLS
 *
 */
export class HmIPDoorLockSensor extends HmIPGenericDevice {
    service;
    lockState = LockState.UNKNOWN;
    targetLockState = this.platform.Characteristic.LockTargetState.UNSECURED;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug(`Created door lock sensor ${accessory.context.device.label}`);
        this.service = this.accessory.getService(this.platform.Service.LockMechanism)
            || this.accessory.addService(this.platform.Service.LockMechanism);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.updateDevice(accessory.context.device, platform.groups);
        this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
            .onGet(this.handleLockCurrentStateGet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.LockTargetState)
            .onGet(this.handleLockTargetStateGet.bind(this));
    }
    handleLockCurrentStateGet() {
        return this.getHmKitLockCurrentState(this.lockState);
    }
    handleLockTargetStateGet() {
        return this.targetLockState;
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'DOOR_LOCK_SENSOR_CHANNEL') {
                const doorLockSensorChannel = channel;
                this.platform.log.debug(`Door lock sensor update: ${JSON.stringify(channel)}`);
                if (doorLockSensorChannel.lockState !== null && doorLockSensorChannel.lockState !== this.lockState) {
                    this.lockState = doorLockSensorChannel.lockState;
                    this.platform.log.info('Door lock sensor lock state of %s changed to %s', this.accessory.displayName, this.lockState);
                    this.updateHmKitLockTargetState();
                    this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, this.getHmKitLockCurrentState(this.lockState));
                    this.service.updateCharacteristic(this.platform.Characteristic.LockTargetState, this.targetLockState);
                }
            }
        }
    }
    getHmKitLockCurrentState(lockState) {
        switch (lockState) {
            case LockState.LOCKED:
                return this.platform.Characteristic.LockCurrentState.SECURED;
            case LockState.UNLOCKED:
                return this.platform.Characteristic.LockCurrentState.UNSECURED;
            case LockState.UNKNOWN:
                return this.platform.Characteristic.LockCurrentState.UNKNOWN;
            default:
                return this.platform.Characteristic.LockCurrentState.UNKNOWN;
        }
    }
    updateHmKitLockTargetState() {
        switch (this.lockState) {
            case LockState.LOCKED:
                this.targetLockState = this.platform.Characteristic.LockTargetState.SECURED;
                break;
            case LockState.UNLOCKED:
                this.targetLockState = this.platform.Characteristic.LockTargetState.UNSECURED;
                break;
            case LockState.UNKNOWN:
                this.targetLockState = this.platform.Characteristic.LockTargetState.UNSECURED;
                break;
        }
    }
}
//# sourceMappingURL=HmIPDoorLockSensor.js.map
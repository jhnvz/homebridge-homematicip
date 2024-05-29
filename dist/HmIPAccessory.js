import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
/**
 * Accessory wrapper
 */
export class HmIPAccessory {
    api;
    log;
    accessory;
    isFromCache;
    constructor(api, log, accessory, isFromCache) {
        this.api = api;
        this.log = log;
        this.accessory = accessory;
        this.isFromCache = isFromCache;
    }
    register() {
        if (this.isFromCache) {
            this.log.debug('Updating accessory: %s (%s) -> uuid %s', this.accessory.displayName, this.accessory.context.device.id, this.accessory.UUID);
            this.api.updatePlatformAccessories([this.accessory]);
        }
        else {
            this.log.info('Register accessory: %s (%s) -> uuid %s', this.accessory.displayName, this.accessory.context.device.id, this.accessory.UUID);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessory]);
        }
    }
}
//# sourceMappingURL=HmIPAccessory.js.map
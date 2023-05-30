import { Service, PlatformAccessory } from 'homebridge';
import { NytCrosswordHomebridgePlatform } from './platform';
import fetch from 'node-fetch';

/**
 * NYT Streak Alert (Contact Sensor)
 *
 * Open when the NYT subscriber is less than config.streakAlertWarningMinutes away from losing their streak.
*/
export class NytStreakAlertAccessory {
  private service: Service;

  constructor(
    private readonly platform: NytCrosswordHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'NYT Crossword')
      .setCharacteristic(this.platform.Characteristic.Model, 'Streak Alert')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'streak-alert-'
        + this.platform.config.subscriberId.substring(0, 8));

    this.service = this.accessory.getService(this.platform.Service.ContactSensor) ||
      this.accessory.addService(this.platform.Service.ContactSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    this.updateStreakAlert();

    const streakAlertMs = this.platform.config.streakAlertUpdateSeconds * 1000;
    this.platform.log.debug(`Starting streak alert polling every ${streakAlertMs} milliseconds`);
    if (streakAlertMs > 0) {
      setInterval((accessory : NytStreakAlertAccessory) => {
        accessory.updateStreakAlert();
      }, streakAlertMs, this);
    }
  }


  async updateStreakAlert() {
    try {
      const now = new Date();
      const userResult = JSON.parse(await this.performNytGet(`https://www.nytimes.com/puzzles/user?bust=${now.valueOf()}`));

      this.platform.log.debug('Retrieved user is: ', JSON.stringify(userResult, null, 4));
      const streakResult = JSON.parse(await this.performNytGet('https://edge.games.nyti.nyt.net/svc/crosswords/v3/' +
        `${userResult.id}/stats-and-streaks.json?date_start=2014-01-01&start_on_monday=true`));

      const lastStreakDay = new Date(streakResult.results.streaks.date_end);
      lastStreakDay.setTime(lastStreakDay.getTime() + lastStreakDay.getTimezoneOffset() * 60 * 1000);
      this.platform.log.debug(`Last day of streak: ${lastStreakDay}`);

      const streakEndTime = new Date(lastStreakDay);
      // This approach should handle daylight savings time!
      streakEndTime.setDate(streakEndTime.getDate() + 2);
      streakEndTime.setHours(0, 0, 0, 0);
      this.platform.log.debug(`Streak will end on: ${streakEndTime}`);
      this.platform.log.debug(`User has ${(streakEndTime.getTime() - now.getTime()) / (1000*60)} minutes left`);
      const streakAlertWarningMs = this.platform.config.streakAlertWarningMinutes * 60 * 1000;
      const sensorState = (streakEndTime.getTime() - now.getTime() <= streakAlertWarningMs) ?
        this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED :
        this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;

      this.platform.log.debug(`Streak warning sensor state is ${sensorState}`);
      this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, sensorState);
    } catch (error) {
      this.platform.log.error(`Error occurred during HTTP request: ${error}`);
    }

    // this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState,
    //   this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED);

    //this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  async performNytGet(url : string): Promise<string> {
    try {
      this.platform.log.debug(`Making HTTP request to ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          cookie: 'Nyt-S=' + this.platform.config.subscriberId,
        },
      });

      if (!response.ok) {
        return Promise.reject(new Error(`HTTP request failed with status ${response.status}`));
      }

      return response.text();
    } catch (error) {
      return Promise.reject(new Error(`Error occurred during HTTP request: ${error}`));
    }
  }
}

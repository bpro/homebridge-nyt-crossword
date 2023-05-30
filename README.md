# NYT Crossword Streak Alert

This is a plugin that creates a contact sensor to warn you when your NYT Crossword streak is close to being lost, which can then be used for automations.

## Initial Setup

1. Install the plugin via [`homebridge-config-ui-x`](https://github.com/oznu/homebridge-config-ui-x#readme) for initial setup.
2. Put your [NYT Subscriber Cookie](https://xwstats.com/link) from Step 1 + 2 into the `Subscriber ID` field in the plugin settings.
3. Update `Streak Alert Warning Minutes` to the amount warning time you want before the streak gets lost.
    - For example, if `Streak Alert Warning Minutes` is `60`, then the contact sensor will `Open` one hour before the streak is lost.
4. Restart Homebridge!

## Contact Sensor Behavior

The contact sensor will be `Open` when the streak is at risk (i.e. when there are less than `Streak Alert Warning Minutes` until the streak is lost)), and `Closed` otherwise.

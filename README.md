<img src="src/assets/yardpilot.png" height=50>

Path planning companion to ArduPilot's Mission Planner

# WORK IN PROGRESS!

This project is a work in progress and is not ready for deployment. It is very unoptimized and contains bugs.

If you want to give it a try, you can create a local dev build using `bun`:

[Follow the installation instructions on Bun's website](https://bun.sh/docs/installation)

Then, you can run the development server using:

```
cd <path/to/yard-pilot>
bun install
bun run dev
```

A local development server will be started at `http://localhost:5173`.

### Rover 4.4+ tuning notes

#### Fast Boustrophedon path navigation with a skid-steered vehicle (zero-turn mower):

* Ensure GPS_POS offsets are well-measured and correct in both the X and Y axes.
* Tune the speed controller well, including pivot turns to dial in all the gain values (we will disable them later).
* Tune the steering rate controller well.
* Tune the position controller well. I ended up with quite high gains  (PSC_VEL_P greater than 3!).
* Set WP_PIVOT_ANGLE to 0 (disabled) or a very high (maybe 135-160+) value.
* Set TURN_RADIUS to a small value (0.2 to 0.5m).
* Set WP_RADIUS approximately equal to but not less than TURN_RADIUS.
* Set TURN_MAX_G to a low value (0.05 - 0.15). [This calculator]( https://rechneronline.de/g-acceleration/curve.php) may help.
* Set ATC_ACCEL_MAX to 0.5 to 1.5 - observe forward acceleration out of turns for lurches or sluggish motion.
* Set ATC_DECEL_MAX to a similar range - observe waypoint overshoots (and review IMU.AccX for truth data).

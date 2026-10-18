Three.js r180 (npm version 0.180.0), MIT license; see LICENSE.

Official source: https://github.com/mrdoob/three.js/tree/r180

Files are vendored for offline local viewing. OrbitControls.js has one local
import substitution: `from 'three'` becomes `from './three.module.js'`.
RoomEnvironment.js is also from r180 and uses the same local import substitution.
The build files are unchanged. No external CDN or telemetry is used by the viewer.

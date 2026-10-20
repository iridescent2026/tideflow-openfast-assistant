# Results page turbine layers

Generated with the built-in imagegen tool on 2026-10-20 for the local TIDEFLOW results page. Both PNG files preserve their generated alpha transparency. These are visual assets, not reference-model geometry.

- `turbine-body-v3.png`: portrait 1024 x 1536. Prompt direction: premium front-facing silver-white OC4-style offshore wind support structure; detailed columns, braces, ladders, pale cyan lower steel, yellow safety rails; nacelle hub but no rotor blades; transparent background.
- `turbine-rotor-v3.png`: square 1254 x 1254. Prompt direction: photorealistic front-facing three-blade offshore turbine rotor; tapered satin white blades, metallic hub and subtle aqua shading; transparent background; separate layer for animation.

The body and rotor are composed in SVG without rewriting their raster files. Rotor pivot is aligned at (512, 498) in the composite viewBox and rotation uses the exploration speed in rpm. The separate rotor image is positioned to account for its generated off-center hub. The image does not participate in OpenFAST calculations.

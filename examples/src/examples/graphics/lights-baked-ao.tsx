import * as pc from 'playcanvas/build/playcanvas.js';
import Example from '../../app/example';

class LightsBakedAOExample extends Example {
    static CATEGORY = 'Graphics';
    static NAME = 'Lights Baked AO';
    static HIDDEN = false;

    // @ts-ignore: override class function
    example(canvas: HTMLCanvasElement): void {

        // Create the application and start the update loop
        const app = new pc.Application(canvas, {});
        app.start();

        // Set the canvas to fill the window and automatically change resolution to be the same as the canvas size
        app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        app.setCanvasResolution(pc.RESOLUTION_AUTO);

        app.scene.ambientLight = new pc.Color(0.1, 0.1, 0.1);

        // create material used to render lightmapped objects. Set it up using metalness to see the specularity
        const material = new pc.StandardMaterial();
        material.shininess = 60;
        material.useMetalness = true;
        material.metalness = 0.03;
        material.update();

        // create ground plane
        const ground = new pc.Entity("Ground");
        ground.addComponent('render', {
            castShadows: false,
            castShadowsLightmap: false,
            lightmapped: true,
            type: "box",
            material: material
        });
        app.root.addChild(ground);
        ground.setLocalScale(40, 1, 40);

        // create roof box
        const roof = new pc.Entity("Roof");
        roof.addComponent('render', {
            castShadows: false,
            castShadowsLightmap: true,
            lightmapped: true,
            type: "box",
            material: material
        });
        app.root.addChild(roof);
        roof.setLocalPosition(0, 6, -10);
        roof.setLocalScale(15, 1, 45);
        roof.setLocalEulerAngles(-30, 0, 0);



        // create large sphere
        const sphere = new pc.Entity("Ground");
        sphere.addComponent('render', {
            castShadows: false,
            castShadowsLightmap: true,
            lightmapped: true,
            type: "sphere",
            material: material
        });
        app.root.addChild(sphere);
        sphere.setLocalScale(12, 12, 12);
        sphere.setLocalPosition(3, 6.6, 5);
        


        // create random objects on the plane
        const shapes = ["box", "cone", "cylinder", "sphere"];
        for (let i = 0; i < 40; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];

            // Create an entity with a render component that is set up to be lightmapped with baked direct lighting
            const entity = new pc.Entity("Primitive" + i);
            entity.addComponent('render', {
                castShadows: false,
                castShadowsLightmap: true,
                lightmapped: true,
                type: shape,
                material: material
            });
            app.root.addChild(entity);

            // random orientation
            const scale = 1 + Math.random() * 2;
            entity.setLocalScale(scale, scale, scale);
            entity.setLocalPosition(Math.random() * 30 - 15, scale, Math.random() * 30 - 15);
            entity.setLocalEulerAngles(Math.random() * 360, Math.random() * 360, Math.random() * 360);
        }

        // // directional light
        // const light = new pc.Entity("Directional");
        // light.addComponent("light", {
        //     type: "directional",
        //     affectDynamic: true,
        //     affectLightmapped: false,
        //     bake: true,
        //     numBakeSamples: 20,
        //     castShadows: true,
        //     normalOffsetBias: 0.05,
        //     shadowBias: 0.2,
        //     shadowDistance: 50,
        //     shadowResolution: 2048,
        //     shadowType: pc.SHADOW_PCF3,
        //     color: pc.Color.WHITE,
        //     intensity: 0.8
        // });
        // app.root.addChild(light);
        // light.setLocalEulerAngles(0, 10, 0);

        // // Create an entity with a omni light component that is configured as a baked light
        // const lightPoint = new pc.Entity("Point");
        // lightPoint.addComponent("light", {
        //     affectDynamic: false,
        //     affectLightmapped: true,
        //     bake: true,
        //     castShadows: true,
        //     normalOffsetBias: 0.05,
        //     shadowBias: 0.2,
        //     shadowDistance: 50,
        //     shadowResolution: 512,
        //     shadowType: pc.SHADOW_PCF3,
        //     color: pc.Color.RED,
        //     range: 10,
        //     type: "omni"
        // });
        // lightPoint.setLocalPosition(-6, 5, 0);
        // app.root.addChild(lightPoint);

        // // Create an entity with a spot light component that is configured as a baked light
        // const lightSpot = new pc.Entity("Spot");
        // lightSpot.addComponent("light", {
        //     affectDynamic: false,
        //     affectLightmapped: true,
        //     bake: true,
        //     castShadows: true,
        //     normalOffsetBias: 0.05,
        //     shadowBias: 0.2,
        //     shadowDistance: 50,
        //     shadowResolution: 512,
        //     shadowType: pc.SHADOW_PCF3,
        //     color: pc.Color.BLUE,
        //     range: 10,
        //     type: "spot"
        // });
        // lightSpot.setLocalPosition(5, 8, 0);
        // app.root.addChild(lightSpot);


        // Create an entity with a camera component
        const camera = new pc.Entity();
        camera.addComponent("camera", {
            clearColor: new pc.Color(0.4, 0.45, 0.5),
            farClip: 100,
            nearClip: 0.05
        });
        app.root.addChild(camera);

        // lightmap baking properties
        const bakeType = pc.BAKE_COLOR;
        // const bakeType = pc.BAKE_COLORDIR;
        app.scene.lightmapMode = bakeType;
        app.scene.lightmapMaxResolution = 1024;

        // multiplier for lightmap resolution
        app.scene.lightmapSizeMultiplier = 10;

        // bake lightmaps
        app.lightmapper.bake(null, bakeType);

        // Set an update function on the app's update event
        let time = 0;
        app.on("update", function (dt) {
            time += dt;

            // orbit camera
            camera.setLocalPosition(30 * Math.sin(time * 0.4), 12, 30);
            camera.lookAt(pc.Vec3.ZERO);
        });
    }
}

export default LightsBakedAOExample;

/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 **/

const
    maxSpeed = 50,
    lightCount = 1,
    dist = [200],
    dur = [15];

let trafficLights = [];

for (let i = 0; i < lightCount; i++) {

        let distance = dist[i] / 1000,
            duration = dur[i] / 3600;

        trafficLight = {
            distance: distance,
            duration: duration
        };

    trafficLights.push(trafficLight);

}

function printInput() {
    console.error(`maxSpeed: ${maxSpeed} km/h, ${convertKmToMs(maxSpeed)} m/s`);
    console.error(`lightCount: ${lightCount}`);

    for (let trafficLight of trafficLights)
        console.error(`distance: ${trafficLight.distance} duration: ${trafficLight.duration} state: ${trafficLight.state}`);

}

function convertKmToMs(value) {
    return value * 1000 / 3600
}

function passTrafficLight(trafficLight, speed) {
    let secondsToLight = trafficLight.distance / speed,
        period = secondsToLight / trafficLight.duration;

    console.error(`speed: ${speed} dist: ${trafficLight.distance} duration: ${trafficLight.duration}`);
    console.error(`secondsToLight: ${secondsToLight} period: ${period}`);
    console.error(`secondsToLight: ${period % 2 === 0} `);

    return period % 2 === 0 || period <= 1;
}

function solve(trafficLights, maxSpeed) {
    for (let speed = 1; speed <= maxSpeed; speed++) {

        let count = 0;

        console.error(`current speed: ${speed}`);

        for (let trafficLight of trafficLights) {
            let pass = passTrafficLight(trafficLight, speed);
            if (pass)
                count++;

        }

        if (count === trafficLights.length)
            return speed;

    }
}

printInput();
console.log(`${solve(trafficLights, maxSpeed)}`);










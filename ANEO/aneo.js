/**
 * Auto-generated code below aims at helping you parse
 * the standard input according to the problem statement.
 **/

const
    speed = parseInt(readline()),
    lightCount = parseInt(readline());

let trafficLights = [];

for (let i = 0; i < lightCount; i++) {
    let inputs = readline().split(' '),
        distance = parseInt(inputs[0]),
        duration = parseInt(inputs[1]),
        trafficLight = {
            distance: distance,
            duration: duration
        };

    trafficLights.push(trafficLight);

}

console.error(`speed: ${speed} lightCount: ${lightCount}`);

for (trafficLight of trafficLights)
    console.error(`distance: ${trafficLight.distance} duration: ${trafficLight.duration} `);

// Write an action using console.log()
// To debug: console.error('Debug messages...');

console.log(`${speed}`);


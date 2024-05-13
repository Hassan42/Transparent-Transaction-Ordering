const fs = require('fs');

const sequence  = [0,1];

let eventLog = [];

const shuffle = (array) => { 
    for (let i = array.length - 1; i > 0; i--) { 
      const j = Math.floor(Math.random() * (i + 1)); 
      [array[i], array[j]] = [array[j], array[i]]; 
    } 
    return array; 
};

for (let i = 0; i < 5; i++) {
    const isDelay = Math.round(Math.random());
    let event = [...shuffle(sequence)];
    event[0] = [event[0], [...shuffle(sequence)]];
    event[1] = [event[1], [...shuffle(sequence)]];
    event.push(isDelay);
    eventLog.push(event);
}

const eventLogJSON = JSON.stringify(eventLog);
fs.writeFileSync('eventLogNew.json', eventLogJSON);

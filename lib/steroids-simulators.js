path = require('path');

var simulatorPaths = {
  "2.3.4": path.join(__dirname, "..", "simulators", "Simulator-2.3.4.app")
}

module.exports = {
  iosSimPath: path.join(__dirname, "..", "bin", "ios-sim"),
  latestSimulatorPath: simulatorPaths["2.3.4"],
  simulatorPaths: simulatorPaths
}

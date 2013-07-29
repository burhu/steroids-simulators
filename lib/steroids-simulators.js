path = require('path');

var simulatorPaths = {
  "2.7.6": path.join(__dirname, "..", "simulators", "Simulator-2.7.6.app")
}

module.exports = {
  iosSimPath: path.join(__dirname, "..", "bin", "ios-sim"),
  latestSimulatorPath: simulatorPaths["2.7.6"],
  simulatorPaths: simulatorPaths
}

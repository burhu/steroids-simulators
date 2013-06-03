path = require('path');

var simulatorPaths = {
  "2.7.0": path.join(__dirname, "..", "simulators", "Simulator-2.7.0.app")
}

module.exports = {
  iosSimPath: path.join(__dirname, "..", "bin", "ios-sim"),
  latestSimulatorPath: simulatorPaths["2.7.0"],
  simulatorPaths: simulatorPaths
}

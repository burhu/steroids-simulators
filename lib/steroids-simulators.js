path = require('path');

var simulatorPaths = {
  "2.7.5": path.join(__dirname, "..", "simulators", "Simulator-2.7.5.app")
}

module.exports = {
  iosSimPath: path.join(__dirname, "..", "bin", "ios-sim"),
  latestSimulatorPath: simulatorPaths["2.7.5"],
  simulatorPaths: simulatorPaths
}

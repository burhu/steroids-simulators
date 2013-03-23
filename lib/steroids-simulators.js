path = require('path');

var simulatorPaths = {
  "2.3.3": path.join(__dirname, "..", "simulators", "Simulator-2.3.3.app")
}

module.exports = {
  iosSimPath: path.join(__dirname, "..", "bin", "ios-sim"),
  latestSimulatorPath: simulatorPaths["2.3.3"],
  simulatorPaths: simulatorPaths
}

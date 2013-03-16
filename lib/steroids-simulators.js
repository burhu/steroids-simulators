path = require('path');

var simulatorPaths = {
  "2.3.1": path.join(__dirname, "..", "simulators", "Simulator-2.3.1.app"),
  "2.3.2": path.join(__dirname, "..", "simulators", "Simulator-2.3.2.app")
}

module.exports = {
  iosSimPath: path.join(__dirname, "..", "bin", "ios-sim"),
  latestSimulatorPath: simulatorPaths["2.3.2"],
  simulatorPaths: simulatorPaths
}

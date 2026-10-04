import { installScheduler, schedulerStatus, uninstallScheduler } from "./scheduler-service";

const action = process.argv[2] ?? "status";
const status = action === "install" ? installScheduler() : action === "uninstall" ? uninstallScheduler() : schedulerStatus();
console.log(status);

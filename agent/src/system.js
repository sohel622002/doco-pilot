import si from "systeminformation";

export async function systemStats() {
  const [cpu, memory, diskStats] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.disksIO(),
  ]);

  const sInformation = {
    cpu: {
      usagePercent: cpu.currentLoad.toFixed(1),
    },

    memory: {
      totalGB: (memory.total / 1024 ** 3).toFixed(2),

      usedGB: (memory.used / 1024 ** 3).toFixed(2),

      freeGB: (memory.free / 1024 ** 3).toFixed(2),

      usagePercent: ((memory.used / memory.total) * 100).toFixed(1),
    },

    diskIO: diskStats
      ? {
          readMBps: (diskStats?.rIO_sec / 1024 / 1024).toFixed(2),

          writeMBps: (diskStats?.wIO_sec / 1024 / 1024).toFixed(2),
        }
      : {
          readMBps: 0,
          writeMBps: 0,
        },
  };

  return sInformation;
}

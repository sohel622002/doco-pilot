import si from "systeminformation";

export async function systemStats() {
  const [cpu, memory, diskStats, fsSize] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.disksIO(),
    si.fsSize(),
  ]);

  const time = si.time();

  // Largest filesystem is treated as the "main" disk (usually the root/system volume)
  const mainFs = (fsSize ?? []).reduce(
    (largest, fs) => (!largest || fs.size > largest.size ? fs : largest),
    null,
  );

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

    disk: mainFs
      ? {
          totalGB: (mainFs.size / 1024 ** 3).toFixed(2),
          usedGB: (mainFs.used / 1024 ** 3).toFixed(2),
          usagePercent: Number(mainFs.use).toFixed(1),
        }
      : {
          totalGB: 0,
          usedGB: 0,
          usagePercent: 0,
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

    uptimeSeconds: Math.floor(time.uptime),
  };

  return sInformation;
}

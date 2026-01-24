/**
 * Middleware de logging
 */

export function logger(req, res, next) {
  const start = Date.now();
  const ignored404Paths = new Set([
    "/favicon.ico",
    "/.well-known/security.txt",
    "/index.php",
    "/admin",
  ]);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = (req.originalUrl || req.url || req.path || "").split("?")[0];
    const log = {
      method: req.method,
      path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };
    
    if (res.statusCode >= 500) {
      console.error('❌', log);
      return;
    }

    if (res.statusCode === 404 && ignored404Paths.has(path)) {
      return;
    }

    if (res.statusCode >= 400) {
      // 4xx não deve ir para stderr (error.log do PM2)
      console.log('WARN', log);
    }
    // else {
    //   console.log('✅', log);
    // }
  });
  
  next();
}


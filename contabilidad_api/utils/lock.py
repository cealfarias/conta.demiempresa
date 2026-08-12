import atexit, sys, os
from pathlib import Path

# ==================== PREVENCIÓN DE DOBLE SERVIDOR ====================
LOCK_FILE = Path("server.lock")

def check_server_lock():
    if LOCK_FILE.exists():
        try:
            with open(LOCK_FILE, "r") as f:
                pid_str = f.read().strip()
                if pid_str:
                    old_pid = int(pid_str)
                    # Comprueba si el PID guardado pertenece al proceso padre actual.
                    # Si es así, significa que este es el proceso 'worker' de Uvicorn (reloader).
                    # Por lo tanto, se permite la ejecución sin detener el sistema.
                    if old_pid == os.getppid():
                        return
        except Exception:
            pass

        print("Ya hay un servidor corriendo.")
        print("   Cierra el otro terminal primero o elimina el archivo server.lock")
        sys.exit(1)

    # Crea el archivo de bloqueo y guarda el ID del proceso actual (maestro)
    with open(LOCK_FILE, "w") as f:
        f.write(str(os.getpid()))

    # Borra el archivo automáticamente al cerrar el servidor principal
    atexit.register(lambda: LOCK_FILE.unlink(missing_ok=True))
    print("Server lock activado - Solo se permite un servidor a la vez")

check_server_lock()
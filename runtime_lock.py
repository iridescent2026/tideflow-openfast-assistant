"""OS-held lock shared by UI and batch runners; automatically released on exit."""
from pathlib import Path
import os

class RuntimeLease:
    def __init__(self,path): self.path=Path(path);self.handle=None
    def acquire(self):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        handle=self.path.open('a+b')
        try:
            if handle.tell()==0: handle.write(b'0');handle.flush()
            handle.seek(0)
            if os.name=='nt':
                import msvcrt
                msvcrt.locking(handle.fileno(),msvcrt.LK_NBLCK,1)
            else:
                import fcntl
                fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:
            handle.close()
            raise RuntimeError('另一个本机服务或验证脚本正在使用仿真引擎，请等待其结束。') from None
        self.handle=handle
    def release(self):
        if self.handle: self.handle.close();self.handle=None

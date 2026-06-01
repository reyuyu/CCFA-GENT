**1. 启动后端**

打开一个 PowerShell：
```
cd D:\E\OneDrive\桌面\E\yupaper\ccfa-paper-agent-backend .\.venv310\Scripts\Activate.ps1 uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端启动后不要关这个窗口。

**2. 启动前端**

再打开一个新的 PowerShell：

```
cd D:\E\OneDrive\桌面\E\yupaper\ccfa-paper-agent-frontend npm.cmd run dev`
```

前端一般会显示一个地址，比如：

`http://localhost:5173`

用浏览器打开它。
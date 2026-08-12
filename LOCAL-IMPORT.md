# Local Access Import

1. Put VMOU result files here:

```text
D:\vmou\full-data
```

2. Import the Access files:

```powershell
powershell -ExecutionPolicy Bypass -File D:\vmou\scripts\import-access.ps1 -SourcePath D:\vmou\full-data
```

3. Start or refresh the local portal:

```powershell
C:\Users\chang\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe D:\vmou\server.js
```

The importer reads `.mdb` and `.accdb` files, scans every user table, and writes:

```text
D:\vmou\data\results.json
```

The web app does not contain demo learner records. Search results come from
`data/results.json` through `/api/search`, and exam event options come from
`/api/events`.

Scholar Number and Learner Code are treated as the same identity and stored as:

```text
learnerKey
```

Rows are merged by:

```text
learnerKey + exam event
```

That allows one learner to show multiple real exam attempts while still being
identified by the same Scholar Number / Learner Code.

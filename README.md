# Logbless

**Logbless** is a simple file-based real-time log viewer.

---

### Installation

```shell
pip install logbless
```

---

### Requirements

Your logs must follow the format:

```python
_log_format = "%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d) - %(message)s"
```

Example with logging

```python
import logging

_log_format = "%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d) - %(message)s"
logging.basicConfig(
  level=logging.INFO, format=_log_format, encoding="utf-8", filename="app.log"
)
```

Example log entry:

```text
2025-01-14 07:25:00,779 - [INFO] - aiogram.event - (dispatcher.py).feed_update(172) - Update id=126061252 by bot id=6101975097
```

---

### Usage

1. **Initialize the application:**

   Before starting the application, create a configuration file by running:

   ```shell
   logbless init
   ```

   After executing the command, a file named `logbless_conf.yaml` will be created. You need to edit this file before running the application.

   Example of `logbless_conf.yaml`:

   ```yaml
   authentication:
     login: admin             # Login for accessing the web interface
     password: admin          # Password for accessing the web interface
   host: 127.0.0.1            # Host where the server will run
   log_filename: logs.log     # Path to the log file to be viewed
   path: /logs                # URL path for accessing logs
   port: 8070                 # Port to start the server
   title: Logbless Log viewer # Title of the web page
   ```

   Adjust the file according to your needs.

2. **Run the application:**

   After editing the configuration file, start the application by running:

   ```shell
   logbless run
   ```

   The application will start and be available at `http://127.0.0.1:8070` (or another address if you modified the `host` and `port` settings).

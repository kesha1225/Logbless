import yaml

from justlogs.constants import CONFIG_FILENAME

with open(CONFIG_FILENAME, "r") as file:
    config = yaml.safe_load(file)

PATH = config["path"]
HOST = config["host"]
PORT = config["port"]
LOG_FILENAME = config["log_filename"]
TITLE = config["title"]

LOGIN = config["authentication"]["login"]
PASSWORD = config["authentication"]["password"]

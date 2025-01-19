import click
import os

import uvicorn
import yaml

from justlogs.app import app
from justlogs.config import HOST, PORT
from justlogs.constants import CONFIG_FILENAME, BASE_CONFIG


@click.group()
def cli():
    """JustLogs CLI"""
    pass


@cli.command()
def init():
    if os.path.exists(CONFIG_FILENAME):
        print(
            f"Already inited. Edit {CONFIG_FILENAME} and use justlogs run for start application."
        )
        return

    with open(CONFIG_FILENAME, "w") as f:
        yaml.dump(BASE_CONFIG, f, default_flow_style=False)

    print(
        f"Success! Edit {CONFIG_FILENAME} and use justlogs run for start application."
    )


@cli.command()
def run():
    uvicorn.run(app, host=HOST, port=PORT)


if __name__ == "__main__":
    cli()

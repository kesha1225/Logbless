import click
import os

import uvicorn
import yaml

from logbless.constants import CONFIG_FILENAME, BASE_CONFIG


@click.group()
def cli():
    """Logbless CLI"""
    pass


@cli.command()
def init():
    if os.path.exists(CONFIG_FILENAME):
        print(
            f"The application is already initialized. "
            f"Edit the configuration file '{CONFIG_FILENAME}' and use 'logbless run' to start the application."
        )
        return

    with open(CONFIG_FILENAME, "w") as f:
        yaml.dump(BASE_CONFIG, f, default_flow_style=False)

    print(
        f"Initialization successful! "
        f"Edit the configuration file '{CONFIG_FILENAME}' and use 'logbless run' to start the application."
    )


@cli.command()
def run():
    if not os.path.exists(CONFIG_FILENAME):
        print(
            f"The application is not initialized. "
            f"Please run 'logbless init' first."
        )
        return

    from logbless.app import app
    from logbless.config import HOST, PORT
    uvicorn.run(app, host=HOST, port=PORT)


if __name__ == "__main__":
    cli()
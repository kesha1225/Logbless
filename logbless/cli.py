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
            f"Already inited. Edit {CONFIG_FILENAME} and use logbless run for start application."
        )
        return

    with open(CONFIG_FILENAME, "w") as f:
        yaml.dump(BASE_CONFIG, f, default_flow_style=False)

    print(
        f"Success! Edit {CONFIG_FILENAME} and use logbless run for start application."
    )


@cli.command()
def run():
    if not os.path.exists(CONFIG_FILENAME):
        print(
            f"Logbless is not inited. Type logbless init."
        )
        return
    
    from logbless.app import app
    from logbless.config import HOST, PORT
    uvicorn.run(app, host=HOST, port=PORT)


if __name__ == "__main__":
    cli()

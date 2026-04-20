import os
import shutil

def save_upload(file, path):
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
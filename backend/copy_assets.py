import shutil
import os
from pathlib import Path

def copy_directory(src, dst):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(src, dst)

def copy_file(src, dst):
    if os.path.exists(dst):
        os.remove(dst)
    shutil.copy2(src, dst)

def main():
    # Define source and destination paths
    canvas_dir = Path("Canvas7_Files")
    static_dir = Path("app/static")
    
    # Copy main CSS files
    copy_file(canvas_dir / "style.css", static_dir / "css" / "style.css")
    copy_file(canvas_dir / "style-rtl.css", static_dir / "css" / "style-rtl.css")
    
    # Copy CSS directory contents
    copy_directory(canvas_dir / "css", static_dir / "css")
    
    # Copy JS files
    copy_directory(canvas_dir / "js", static_dir / "js")
    
    # Copy specific JS files that might be in the root
    js_files = [
        "plugins.js",
        "stickfooteronsmall.js",
        "logo.js",
        "headers.js",
        "menus.js",
        "sliderdimensions.js",
        "sliderparallax.js",
        "functions.js"
    ]
    
    for js_file in js_files:
        if (canvas_dir / js_file).exists():
            copy_file(canvas_dir / js_file, static_dir / "js" / js_file)
    
    # Copy images
    copy_directory(canvas_dir / "images", static_dir / "images")
    
    # Copy fonts if they exist
    if (canvas_dir / "fonts").exists():
        copy_directory(canvas_dir / "fonts", static_dir / "fonts")
    
    # Copy specific JS files from js directory
    js_files_to_copy = [
        "jquery.js",
        "plugins.min.js",
        "functions.js",
        "plugins.bootstrap.js",
        "plugins.fastdom.js",
        "plugins.lightbox.js",
        "plugins.form.js",
        "plugins.easing.js",
        "plugins.imagesloaded.js"
    ]
    
    for js_file in js_files_to_copy:
        src_file = canvas_dir / "js" / js_file
        if src_file.exists():
            copy_file(src_file, static_dir / "js" / js_file)
    
    print("Static files copied successfully!")

if __name__ == "__main__":
    main() 
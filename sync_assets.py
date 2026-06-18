import shutil
import os

files_to_sync = ['app.js', 'data.js', 'index.html', 'index.css', 'charts.js', 'scoring.js']

android_dest = os.path.join('fit-tracker-android', 'app', 'src', 'main', 'assets')
ios_dest = os.path.join('fit-tracker-ios', 'FitTracker', 'assets')

def sync_directory(dest_dir):
    if not os.path.exists(dest_dir):
        print(f"Directory {dest_dir} does not exist. Skipping.")
        return
    for filename in files_to_sync:
        src_path = filename
        dest_path = os.path.join(dest_dir, filename)
        try:
            shutil.copy2(src_path, dest_path)
            print(f"Successfully synced {src_path} -> {dest_path}")
        except Exception as e:
            print(f"Error copying {src_path} to {dest_path}: {e}")
    
    # Sync lib directory
    lib_src = 'lib'
    lib_dest = os.path.join(dest_dir, 'lib')
    if os.path.exists(lib_src):
        try:
            if os.path.exists(lib_dest):
                shutil.rmtree(lib_dest)
            shutil.copytree(lib_src, lib_dest)
            print(f"Successfully synced {lib_src} -> {lib_dest}")
        except Exception as e:
            print(f"Error syncing {lib_src} to {lib_dest}: {e}")

print("Starting asset synchronization...")
print("-" * 50)
print("Syncing to Android assets:")
sync_directory(android_dest)
print("\nSyncing to iOS assets:")
sync_directory(ios_dest)
print("-" * 50)
print("Synchronization complete!")

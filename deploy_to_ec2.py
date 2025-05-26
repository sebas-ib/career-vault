import subprocess

# === CONFIGURATION ===
EC2_USER = "ec2-user"
EC2_HOST = "ec2-35-175-218-182.compute-1.amazonaws.com"  # e.g., ec2-3-88-XXX-XXX.compute-1.amazonaws.com
EC2_PATH = "~/"           # Destination directory on EC2
PEM_FILE = "/Users/sebastian/Downloads/career-vault.pem"    # Path to your SSH private key
PROJECT_DIR = "."  # Current directory
TAR_NAME = "career-vault.tar.gz"


# === STEP 1: Create the tarball locally ===
print("Creating tarball...")
subprocess.run([
    "tar", "--exclude=.DS_Store", "--exclude=node_modules", "--exclude=.env.local",
    "--exclude=__pycache__", "--exclude=venv", "--exclude=career-vault.tar.gz", "--exclude=deploy_to_ec2","-czf", TAR_NAME, PROJECT_DIR
], check=True)

# === STEP 2: Upload tarball to EC2 ===
print(f"Uploading {TAR_NAME} to EC2...")
subprocess.run([
    "scp", "-i", PEM_FILE, TAR_NAME, f"{EC2_USER}@{EC2_HOST}:{EC2_PATH}/"
], check=True)

# === STEP 3: SSH into EC2 and run commands ===
commands = f"""
cd {EC2_PATH}
tar -xzf {TAR_NAME}
find . -type f -name '._*' -delete
find . -type f -name '.__*' -delete
"""

print("Running remote commands on EC2...")
subprocess.run([
    "ssh", "-i", PEM_FILE, f"{EC2_USER}@{EC2_HOST}", commands
], check=True)

print("Deployment complete.")

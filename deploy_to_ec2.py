import subprocess

# config
EC2_USER = "ec2-user"
EC2_HOST = "ec2-35-175-218-182.compute-1.amazonaws.com" 
EC2_PATH = "~/" 
PEM_FILE = "/Users/sebastian/Downloads/career-vault.pem" 
PROJECT_DIR = "."
TAR_NAME = "career-vault.tar.gz"


# Create the tarball
print("Creating tarball...")
subprocess.run([
    "tar", "--exclude=.DS_Store", "--exclude=node_modules", "--exclude=.env.local",
    "--exclude=__pycache__", "--exclude=venv", "--exclude=career-vault.tar.gz", "--exclude=deploy_to_ec2","-czf", TAR_NAME, PROJECT_DIR
], check=True)

# Upload tarball to EC2
print(f"Uploading {TAR_NAME} to EC2...")
subprocess.run([
    "scp", "-i", PEM_FILE, TAR_NAME, f"{EC2_USER}@{EC2_HOST}:{EC2_PATH}/"
], check=True)

# SSH into EC2 and run commands
commands = f"""
cd {EC2_PATH}
tar -xzf {TAR_NAME}
find . -type f -name '._*' -delete
find . -type f -name '.__*' -delete
docker-compose down
docker-compose up --build -d
"""

print("Running commands on EC2...")
subprocess.run([
    "ssh", "-i", PEM_FILE, f"{EC2_USER}@{EC2_HOST}", commands
], check=True)

print("Done")

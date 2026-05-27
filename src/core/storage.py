import os
import uuid
import aioboto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
from src.core.config import settings

class AsyncStorageService:
    def __init__(self):
        # Utilisation exclusive de l'objet settings validé par Pydantic
        self.endpoint_url = f"http://{settings.MINIO_ENDPOINT}"
        self.access_key = settings.MINIO_ACCESS_KEY
        self.secret_key = settings.MINIO_SECRET_KEY
        self.bucket_cv = settings.MINIO_BUCKET_NAME
        
        # Configuration de la session asynchrone aioboto3
        self.session = aioboto3.Session()

    def _get_client(self):
        """Initialise le client de session asynchrone pour S3/MinIO"""
        return self.session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
        )

    async def initialize_buckets(self):
        """Vérifie et crée le bucket de stockage s'il n'existe pas au démarrage"""
        async with self._get_client() as s3:
            try:
                await s3.head_bucket(Bucket=self.bucket_cv)
            except ClientError as e:
                # Si le code est 404, le bucket n'existe pas, on le crée
                error_code = e.response.get("Error", {}).get("Code")
                if error_code == "404":
                    await s3.create_bucket(Bucket=self.bucket_cv)

    async def upload_cv(self, file: UploadFile) -> str:
        """
        Upload un CV de manière asynchrone et renvoie sa clé unique de stockage
        """
        # Extraction de l'extension et génération d'une clé unique basée sur un UUID
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"cvs/{uuid.uuid4()}{file_extension}"

        async with self._get_client() as s3:
            # Lecture du contenu binaire du fichier transmis
            file_content = await file.read()
            
            # Téléversement asynchrone vers MinIO
            await s3.put_object(
                Bucket=self.bucket_cv,
                Key=unique_filename,
                Body=file_content,
                ContentType=file.content_type
            )
            return unique_filename

    async def generate_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        """
        Génère une URL sécurisée et temporaire (valide 1h par défaut) pour consulter le CV.
        Sécurité : Les fichiers ne sont jamais publics directement
        """
        async with self._get_client() as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_cv, "Key": file_key},
                ExpiresIn=expires_in
            )
            return url

    async def download_file(self, file_key: str, destination_path: str) -> None:
        """
        Télécharge un objet depuis MinIO vers un fichier local.
        Utilisé principalement par les workers Celery pour accéder aux CVs avant parsing.
        """
        async with self._get_client() as s3:
            response = await s3.get_object(Bucket=self.bucket_cv, Key=file_key)
            async with response["Body"] as stream:
                data = await stream.read()
            with open(destination_path, "wb") as f:
                f.write(data)
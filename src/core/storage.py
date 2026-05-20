import aioboto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
import os
import uuid

class AsyncStorageService:
    def __init__(self):
        self.endpoint_url = f"http://{os.getenv('MINIO_ENDPOINT', 'localhost:9000')}"
        self.access_key = os.getenv("MINIO_ACCESS_KEY")
        self.secret_key = os.getenv("MINIO_SECRET_KEY")
        self.bucket_cv = os.getenv("MINIO_BUCKET_CV", "candidats-cv")
        
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
                    print(f"Bucket '{self.bucket_cv}' créé avec succès dans MinIO.")

    async def upload_cv(self, file: UploadFile) -> str:
        """
        Upload un CV de manière asynchrone et renvoie sa clé unique de stockage
        """
        # Génération d'un nom de fichier unique pour éviter les collisions (ex: uuid_nom.pdf)
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"cvs/{uuid.uuid4()}{file_extension}"

        async with self._get_client() as s3:
            # Lecture du contenu du fichier
            file_content = await file.read()
            
            # Upload asynchrone vers MinIO
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
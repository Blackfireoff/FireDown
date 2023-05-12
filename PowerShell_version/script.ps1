$doss = Read-Host "Entrez le nom du dossier "

while($true)
{
	$url = Read-Host "Entrez l'URL de la vidéo "
	.\yt-dlp.exe -x --audio-format mp3 --ffmpeg-location .\ffmpeg-2023-04-26-git-e3143703e9-essentials_build\ffmpeg-2023-04-26-git-e3143703e9-essentials_build\bin\ --add-metadata  --audio-quality 0 -o .\Musique\$doss\"%(title)s.%(ext)s" "$url" 
}
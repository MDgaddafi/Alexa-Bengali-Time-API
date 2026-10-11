$ffmpeg = "C:\Users\Astrum It\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

$audioDir = "c:\Users\Astrum It\Documents\Ai all project\Alexa\public\audio"
if (!(Test-Path $audioDir)) {
    New-Item -ItemType Directory -Path $audioDir -Force | Out-Null
}

$timeSlots = @(
    @{ Key = "06-00"; Text = "এখন সকাল ৬টা বাজে" },
    @{ Key = "06-30"; Text = "এখন সকাল সাড়ে ৬টা বাজে" },
    @{ Key = "07-00"; Text = "এখন সকাল ৭টা বাজে" },
    @{ Key = "07-30"; Text = "এখন সকাল সাড়ে ৭টা বাজে" },
    @{ Key = "08-00"; Text = "এখন সকাল ৮টা বাজে" },
    @{ Key = "08-30"; Text = "এখন সকাল সাড়ে ৮টা বাজে" },
    @{ Key = "09-00"; Text = "এখন সকাল ৯টা বাজে" },
    @{ Key = "09-30"; Text = "এখন সকাল সাড়ে ৯টা বাজে" },
    @{ Key = "10-00"; Text = "এখন সকাল ১০টা বাজে" },
    @{ Key = "10-30"; Text = "এখন সকাল সাড়ে ১০টা বাজে" },
    @{ Key = "11-00"; Text = "এখন সকাল ১১টা বাজে" },
    @{ Key = "11-30"; Text = "এখন সকাল সাড়ে ১১টা বাজে" },
    @{ Key = "12-00"; Text = "এখন দুপুর ১২টা বাজে" },
    @{ Key = "12-30"; Text = "এখন দুপুর সাড়ে ১২টা বাজে" },
    @{ Key = "13-00"; Text = "এখন দুপুর ১টা বাজে" },
    @{ Key = "13-30"; Text = "এখন দুপুর দেড়টা বাজে" },
    @{ Key = "14-00"; Text = "এখন দুপুর ২টা বাজে" },
    @{ Key = "14-30"; Text = "এখন দুপুর আড়াইটা বাজে" },
    @{ Key = "15-00"; Text = "এখন দুপুর ৩টা বাজে" },
    @{ Key = "15-30"; Text = "এখন দুপুর সাড়ে ৩টা বাজে" },
    @{ Key = "16-00"; Text = "এখন বিকেল ৪টা বাজে" },
    @{ Key = "16-30"; Text = "এখন বিকেল সাড়ে ৪টা বাজে" },
    @{ Key = "17-00"; Text = "এখন বিকেল ৫টা বাজে" },
    @{ Key = "17-30"; Text = "এখন বিকেল সাড়ে ৫টা বাজে" },
    @{ Key = "18-00"; Text = "এখন সন্ধ্যা ৬টা বাজে" },
    @{ Key = "18-30"; Text = "এখন সন্ধ্যা সাড়ে ৬টা বাজে" },
    @{ Key = "19-00"; Text = "এখন সন্ধ্যা ৭টা বাজে" },
    @{ Key = "19-30"; Text = "এখন সন্ধ্যা সাড়ে ৭টা বাজে" },
    @{ Key = "20-00"; Text = "এখন রাত ৮টা বাজে" },
    @{ Key = "20-30"; Text = "এখন রাত সাড়ে ৮টা বাজে" },
    @{ Key = "21-00"; Text = "এখন রাত ৯টা বাজে" },
    @{ Key = "21-30"; Text = "এখন রাত সাড়ে ৯টা বাজে" },
    @{ Key = "22-00"; Text = "এখন রাত ১০টা বাজে" }
)

Write-Host "Generating $($timeSlots.Count) audio files for Alexa SSML..."

foreach ($slot in $timeSlots) {
    $encodedText = [System.Uri]::EscapeDataString($slot.Text)
    $ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&q=$encodedText&tl=bn&total=1&idx=0&client=tw-ob"
    
    $tempFile = "$audioDir\temp.mp3"
    $targetFile = "$audioDir\$($slot.Key).mp3"
    
    Write-Host "Processing $($slot.Key): $($slot.Text)..."
    Invoke-WebRequest -Uri $ttsUrl -OutFile $tempFile -UserAgent "Mozilla/5.0"
    
    # Convert to Alexa-compliant format: 48kbps, 24000Hz, Mono MP3
    & $ffmpeg -y -i $tempFile -ac 1 -ar 24000 -b:a 48k $targetFile 2>$null
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host "All audio files successfully generated in $audioDir!"

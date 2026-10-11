$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ffmpeg = "C:\Users\Astrum It\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

$hoursDir = "c:\Users\Astrum It\Documents\Ai all project\Alexa\public\audio\hours"
$minutesDir = "c:\Users\Astrum It\Documents\Ai all project\Alexa\public\audio\minutes"

New-Item -ItemType Directory -Path $hoursDir -Force | Out-Null
New-Item -ItemType Directory -Path $minutesDir -Force | Out-Null

function Gen-Phrase($text, $file) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hex = ($bytes | ForEach-Object { "%{0:X2}" -f $_ }) -join ""
    $url = "https://translate.google.com/translate_tts?ie=UTF-8&q=$hex&tl=bn&total=1&idx=0&client=tw-ob"
    Invoke-WebRequest -Uri $url -OutFile "temp.mp3" -UserAgent "Mozilla/5.0"
    & $ffmpeg -y -i "temp.mp3" -af "silenceremove=stop_periods=-1:stop_duration=0.08:stop_threshold=-40dB" -ac 1 -ar 24000 -b:a 48k $file 2>$null
    Remove-Item "temp.mp3" -ErrorAction SilentlyContinue
}

$hourTexts = @{
    0 = "এখন রাত ১২টা"
    1 = "এখন রাত ১টা"
    2 = "এখন রাত ২টা"
    3 = "এখন রাত ৩টা"
    4 = "এখন ভোর ৪টা"
    5 = "এখন ভোর ৫টা"
    6 = "এখন সকাল ৬টা"
    7 = "এখন সকাল ৭টা"
    8 = "এখন সকাল ৮টা"
    9 = "এখন সকাল ৯টা"
    10 = "এখন সকাল ১০টা"
    11 = "এখন সকাল ১১টা"
    12 = "এখন দুপুর ১২টা"
    13 = "এখন দুপুর ১টা"
    14 = "এখন দুপুর ২টা"
    15 = "এখন দুপুর ৩টা"
    16 = "এখন বিকেল ৪টা"
    17 = "এখন বিকেল ৫টা"
    18 = "এখন সন্ধ্যা ৬টা"
    19 = "এখন সন্ধ্যা ৭টা"
    20 = "এখন রাত ৮টা"
    21 = "এখন রাত ৯টা"
    22 = "এখন রাত ১০টা"
    23 = "এখন রাত ১১টা"
}

Write-Host "Generating 24 hour phrases..."
foreach ($h in 0..23) {
    $file = "$hoursDir\h$h.mp3"
    Gen-Phrase $hourTexts[$h] $file
    Write-Host "Hour $h generated"
}

Write-Host "Generating 59 minute phrases..."
$bnDigits = @('০','১','২','৩','৪','৫','৬','৭','৮','৯')
function To-Bn($num) {
    return ($num.ToString().ToCharArray() | ForEach-Object { $bnDigits[[int]$_.ToString()] }) -join ""
}

foreach ($m in 1..59) {
    $bnM = To-Bn $m
    $text = "$bnM মিনিট বাজে"
    $file = "$minutesDir\m$m.mp3"
    Gen-Phrase $text $file
    if ($m % 10 -eq 0) { Write-Host "Minute $m generated" }
}

Write-Host "All dynamic snippets generated successfully!"

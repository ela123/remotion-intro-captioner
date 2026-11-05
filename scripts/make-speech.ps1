Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SetOutputToWaveFile("test-speech.wav")
$speaker.Speak("Welcome to the video captioner studio")
$speaker.Dispose()
Write-Output "Speech WAV written successfully"

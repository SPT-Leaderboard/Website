<?php
function hashIP($ip) {
    return hash('sha256', $ip . '3982ncr23ru2389FWIEFOIWfs');
}

function updateOnlineStatus($hashedIP)
{
    $finalFile = __DIR__ . '/../fallbacks/heartbeats.json';
    
    if (file_exists($finalFile)) {
        $data = json_decode(file_get_contents($finalFile), true) ?? [];
    } else {
        $data = [];
    }

    $data[$hashedIP] = [
        "id" => $hashedIP,
        "timestamp" => time(),
        "type" => "online"
    ];
    
    if (file_put_contents($finalFile, json_encode($data, JSON_PRETTY_PRINT))) {
        return true;
    }
    
    return false;
}

$hashedIP = hashIP($_SERVER['REMOTE_ADDR']);
updateOnlineStatus($hashedIP);
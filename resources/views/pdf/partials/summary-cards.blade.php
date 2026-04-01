@php $count = count($cards); $width = round(100 / $count); @endphp
<div class="summary-container">
    @foreach($cards as $card)
    <div class="summary-card" style="width: {{ $width }}%;">
        <div class="summary-box {{ $card['color'] }}">
            <div class="summary-label">{{ $card['label'] }}</div>
            <div class="summary-value {{ $card['color'] }}">{{ $card['value'] }}</div>
        </div>
    </div>
    @endforeach
</div>

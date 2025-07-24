<script>
	import './style.scss';
	const { name, role, image, color, isactive } = $props();
	const userImage = `url(${image})`;
</script>

<div class="user" class:active={isactive} style="background-color: {color};">
	<div class="icon" style="background-image: {userImage};"></div>
	<div class="info">
		<p>{name}</p>
		<p>{role}</p>
	</div>
</div>
